const mockCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
})

describe('generatePlan (claudeClient)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    mockCreate.mockReset()
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

  it('テキストブロックのレスポンスをそのまま返す', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '{"ok":true}' }] })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    const result = await generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])

    expect(result).toBe('{"ok":true}')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-5',
        system: 'system prompt',
        messages: [{ role: 'user', content: 'prompt' }],
      })
    )
  })

  it('ANTHROPIC_MODEL が設定されていればそのモデルを使う', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    process.env.ANTHROPIC_MODEL = 'claude-opus-4-8'
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    await generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-opus-4-8' }))
  })

  it('テキストブロックが無いレスポンスはエラーを投げる', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({ content: [{ type: 'tool_use' }] })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    await expect(generatePlan('system prompt', [{ role: 'user', content: 'prompt' }])).rejects.toThrow('テキスト形式')
  })

  it('複数ターン（過去のuser/assistantペア＋今回のuser発話）をそのままの順序でmessages.createに転送する（U006）', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: 'A案のランチを提案して' },
      { role: 'assistant', content: '{"candidates":[]}' },
      { role: 'user', content: 'A案のランチを別の店にして' },
    ]

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    await generatePlan('system prompt', messages)

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ system: 'system prompt', messages }))
  })
})
