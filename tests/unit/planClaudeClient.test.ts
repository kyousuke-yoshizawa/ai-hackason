const mockCreate = jest.fn()
const mockAnthropicConstructor = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual('@anthropic-ai/sdk')
  const MockAnthropic = jest.fn().mockImplementation((...args: unknown[]) => {
    mockAnthropicConstructor(...args)
    return { messages: { create: mockCreate } }
  })
  return {
    __esModule: true,
    default: MockAnthropic,
    RateLimitError: actual.RateLimitError,
    APIConnectionTimeoutError: actual.APIConnectionTimeoutError,
    APIError: actual.APIError,
  }
})

describe('generatePlan (claudeClient)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    mockCreate.mockReset()
    mockAnthropicConstructor.mockReset()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('ANTHROPIC_API_KEY が未設定の場合はエラーを投げる', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')

    await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toThrow(
      'ANTHROPIC_API_KEY'
    )
  })

  it('Anthropicクライアントを maxRetries: 2, timeout: 30_000 で構築する（Issue #117）', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'submit_plan', input: { ok: true } }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    await generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])

    expect(mockAnthropicConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-ant-test', maxRetries: 2, timeout: 30_000 })
    )
  })

  it('tool_useブロックのinputをそのままresultとして返す（Issue #118）', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const planObject = {
      intent: { desires: ['ランチ'], party_size: 2, budget: null, time_limit: null },
      candidates: [],
    }
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'submit_plan', input: planObject }],
      usage: { input_tokens: 123, output_tokens: 45 },
    })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    const { result, usage, model } = await generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])

    expect(result).toBe(planObject) // JSON.parseを介さず同一オブジェクトであることを確認
    expect(usage).toEqual({ inputTokens: 123, outputTokens: 45 })
    expect(model).toBe('claude-sonnet-5')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-5',
        system: 'system prompt',
        messages: [{ role: 'user', content: 'prompt' }],
        tools: [
          expect.objectContaining({ name: 'submit_plan' }),
        ],
        tool_choice: { type: 'tool', name: 'submit_plan' },
      })
    )
  })

  it('ANTHROPIC_MODEL が設定されていればそのモデルを使う', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    process.env.ANTHROPIC_MODEL = 'claude-opus-4-8'
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'submit_plan', input: { ok: true } }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    const { model } = await generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])

    expect(model).toBe('claude-opus-4-8')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-opus-4-8' }))
  })

  it('tool_useが無くテキストのコードフェンス付きJSONが返った場合はフェンスを剥がして解析する（Issue #118 フォールバック）', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n{"intent":{"desires":["ランチ"]},"candidates":[]}\n```' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    const { result } = await generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])

    expect(result).toEqual({ intent: { desires: ['ランチ'] }, candidates: [] })
  })

  it('テキストブロックが解析不能なJSONの場合は PlanResponseParseError を投げる', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'これはJSONではありません' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })

    const { generatePlan, PlanResponseParseError } = await import('../../backend/domains/plan/claudeClient')
    await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toThrow(
      PlanResponseParseError
    )
  })

  it('tool_useもテキストブロックも無いレスポンスは PlanResponseParseError を投げる', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({ content: [{ type: 'tool_use', name: 'other_tool', input: {} }] })

    const { generatePlan, PlanResponseParseError } = await import('../../backend/domains/plan/claudeClient')
    await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toThrow(
      PlanResponseParseError
    )
  })

  it('複数ターン（過去のuser/assistantペア＋今回のuser発話）をそのままの順序でmessages.createに転送する（U006）', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'submit_plan', input: { ok: true } }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: 'A案のランチを提案して' },
      { role: 'assistant', content: '{"candidates":[]}' },
      { role: 'user', content: 'A案のランチを別の店にして' },
    ]

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    await generatePlan('system prompt', messages)

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ system: 'system prompt', messages }))
  })

  describe('エラー分類（Issue #117）', () => {
    it('RateLimitError（429）は「混み合っています」を含む PlanGenerationError に変換する', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      const { RateLimitError } = await import('@anthropic-ai/sdk')
      // 実際のコンストラクタは status/error/message/headers 引数が必要でテストでは扱いにくいため、
      // プレーンオブジェクトにプロトタイプだけ差し替えて instanceof RateLimitError を成立させる
      const rateLimitError: unknown = Object.setPrototypeOf({ message: 'rate limited' }, RateLimitError.prototype)
      mockCreate.mockRejectedValue(rateLimitError)

      const { generatePlan, PlanGenerationError } = await import('../../backend/domains/plan/claudeClient')

      await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toBeInstanceOf(
        PlanGenerationError
      )
      await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toMatchObject({
        userMessage: expect.stringContaining('混み合っています'),
      })
    })

    it('APIConnectionTimeoutError は「時間がかかりすぎた」を含む PlanGenerationError に変換する', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      const { APIConnectionTimeoutError } = await import('@anthropic-ai/sdk')
      const timeoutError = new APIConnectionTimeoutError()
      mockCreate.mockRejectedValue(timeoutError)

      const { generatePlan, PlanGenerationError } = await import('../../backend/domains/plan/claudeClient')

      await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toBeInstanceOf(
        PlanGenerationError
      )
      await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toMatchObject({
        userMessage: expect.stringContaining('時間がかかりすぎた'),
      })
    })

    it('その他のエラー（非APIError含む）は汎用メッセージの PlanGenerationError に変換する', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      mockCreate.mockRejectedValue(new Error('network down'))

      const { generatePlan, PlanGenerationError } = await import('../../backend/domains/plan/claudeClient')

      await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toBeInstanceOf(
        PlanGenerationError
      )
      await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toMatchObject({
        userMessage: 'プラン生成に失敗しました',
      })
    })
  })
})
