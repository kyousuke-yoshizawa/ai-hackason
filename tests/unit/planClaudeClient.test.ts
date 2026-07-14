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

    await expect(generatePlan('prompt')).rejects.toThrow('ANTHROPIC_API_KEY')
  })

  it('テキストブロックのレスポンスをそのまま返す', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '{"ok":true}' }] })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    const result = await generatePlan('prompt')

    expect(result).toBe('{"ok":true}')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-5', messages: [{ role: 'user', content: 'prompt' }] })
    )
  })

  it('ANTHROPIC_MODEL が設定されていればそのモデルを使う', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    process.env.ANTHROPIC_MODEL = 'claude-opus-4-8'
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    await generatePlan('prompt')

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-opus-4-8' }))
  })

  it('テキストブロックが無いレスポンスはエラーを投げる', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    mockCreate.mockResolvedValue({ content: [{ type: 'tool_use' }] })

    const { generatePlan } = await import('../../backend/domains/plan/claudeClient')
    await expect(generatePlan('prompt')).rejects.toThrow('テキスト形式')
  })
})
