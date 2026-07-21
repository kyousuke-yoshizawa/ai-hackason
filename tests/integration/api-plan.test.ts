jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

jest.mock('../../backend/domains/plan/claudeClient', () => {
  // generatePlanだけをモックし、PlanGenerationError/PlanResponseParseErrorは実物を使う
  // （api/plan/generate.tsのcatch節がinstanceofで分類するため、モッククラスだと一致しない）
  const actual = jest.requireActual('../../backend/domains/plan/claudeClient')
  return { ...actual, generatePlan: jest.fn() }
})

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { generatePlan, PlanGenerationError, PlanResponseParseError } from '../../backend/domains/plan/claudeClient'
import handler from '../../api/plan/generate'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient
const mockGeneratePlan = generatePlan as jest.Mock

// Issue #118（Tool use）以降、generatePlan()の戻り値resultはJSON文字列ではなく
// パース済みのオブジェクトになる。generatePlanはこのテストファイル内でjest.mockされているため、
// 実際にオブジェクトかJSON文字列かを決めるのはこのモックの戻り値そのもの
const VALID_CLAUDE_RESULT = {
  intent: { desires: ['ランチ'], party_size: 2, budget: null, time_limit: null },
  candidates: [
    {
      label: '案A',
      stops: [
        {
          store_id: 'store-1',
          store_name: 'のんびり亭',
          start_time: '12:00',
          end_time: '13:00',
          travel_note: '徒歩5分',
          reason: 'ランチに最適',
        },
      ],
      score: 0.8,
      summary: 'ランチプラン',
    },
  ],
}

function createMockRes() {
  const res: Partial<VercelResponse> & { statusCode?: number; body?: unknown; headers?: Record<string, string> } = {
    headers: {},
  }
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res as VercelResponse
  }) as unknown as VercelResponse['status']
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res as VercelResponse
  }) as unknown as VercelResponse['json']
  res.setHeader = jest.fn((key: string, value: string) => {
    res.headers![key] = value
    return res as VercelResponse
  }) as unknown as VercelResponse['setHeader']
  return res as VercelResponse & { statusCode: number; body: unknown; headers: Record<string, string> }
}

function createReq(method: string, body: Record<string, unknown> = {}): VercelRequest {
  return { method, body, headers: {}, query: {} } as unknown as VercelRequest
}

beforeEach(() => {
  fakeClient.reset()
  mockGeneratePlan.mockReset()
  fakeClient.seed('stores', [
    {
      id: 'store-1',
      name: 'のんびり亭',
      category: '定食屋・ランチ',
      x: -100,
      y: 30,
      open_time: '11:00',
      close_time: '21:00',
      price_min: 900,
      price_max: 1300,
      deleted_at: null,
    },
  ])
})

afterEach(() => {
  // Issue #121: PLAN_MOCKのテストが他のテストに漏れ出さないよう毎回削除する
  delete process.env.PLAN_MOCK
})

describe('POST /api/plan/generate', () => {
  it('PLAN_MOCK=1の場合はDB・Claude APIを呼ばずモックプランを200で返す（Issue #121）', async () => {
    process.env.PLAN_MOCK = '1'
    fakeClient.reset() // 店舗マスタが空でも、DBに触れずに応答できることを示す

    const res = createMockRes()
    await handler(createReq('POST', { message: 'ランチしたい' }), res)

    expect(res.statusCode).toBe(200)
    expect((res.body as { candidates: unknown[] }).candidates.length).toBeGreaterThan(0)
    expect(mockGeneratePlan).not.toHaveBeenCalled()
  })


  it('GET等の許可外メソッドは405を返す', async () => {
    const res = createMockRes()
    await handler(createReq('GET'), res)

    expect(res.statusCode).toBe(405)
    expect(res.headers.Allow).toBe('POST')
  })

  it('message未指定は400 validation_errorを返す', async () => {
    const res = createMockRes()
    await handler(createReq('POST', {}), res)

    expect(res.statusCode).toBe(400)
    expect((res.body as { error: string }).error).toBe('validation_error')
  })

  it('店舗マスタが空の場合は404を返す', async () => {
    fakeClient.reset()
    const res = createMockRes()
    await handler(createReq('POST', { message: 'ランチしたい' }), res)

    expect(res.statusCode).toBe(404)
    expect((res.body as { error: string }).error).toBe('no_stores')
  })

  it('Claude APIの応答が正しいJSONであれば200でプランを返す', async () => {
    mockGeneratePlan.mockResolvedValue({
      result: VALID_CLAUDE_RESULT,
      usage: { inputTokens: 100, outputTokens: 50 },
      model: 'claude-sonnet-5',
    })

    const res = createMockRes()
    await handler(createReq('POST', { message: 'ランチしたい', party_size: 2 }), res)

    expect(res.statusCode).toBe(200)
    expect((res.body as { candidates: unknown[] }).candidates).toHaveLength(1)
    expect(mockGeneratePlan).toHaveBeenCalledTimes(1)
    // Claude API呼び出しは1回に統合されていることを確認（system/messagesの2引数に分離済み・U006）
    const [system, messages] = mockGeneratePlan.mock.calls[0] as [string, { role: string; content: string }[]]
    expect(system).toContain('のんびり亭')
    expect(messages).toEqual([{ role: 'user', content: expect.stringContaining('ランチしたい') }])
  })

  it('historyを含むリクエストは過去のやり取りを今回の発話より先にmessagesとして転送する（U006）', async () => {
    mockGeneratePlan.mockResolvedValue({
      result: VALID_CLAUDE_RESULT,
      usage: { inputTokens: 100, outputTokens: 50 },
      model: 'claude-sonnet-5',
    })

    const history = [
      { role: 'user', content: 'ランチと映画のプランを作って' },
      { role: 'assistant', content: '{"candidates":[]}' },
    ]

    const res = createMockRes()
    await handler(createReq('POST', { message: 'A案のランチを別の店にして', history }), res)

    expect(res.statusCode).toBe(200)
    const [, messages] = mockGeneratePlan.mock.calls[0] as [string, { role: string; content: string }[]]
    expect(messages).toHaveLength(3)
    expect(messages[0]).toEqual(history[0])
    expect(messages[1]).toEqual(history[1])
    expect(messages[2].role).toBe('user')
    expect(messages[2].content).toContain('A案のランチを別の店にして')
  })

  // 「Claude APIの応答がJSONとして解釈できない場合は502を返す」という旧テストは、
  // Issue #118でハンドラ側のJSON.parseを撤去したことで削除した。このテストファイルでは
  // generatePlan自体をjest.mockしているため、そのパース失敗（テキストのコードフェンス剥がし等）は
  // 実際にはbackend/domains/plan/claudeClient.tsの中でしか発生しなくなった。
  // 該当の失敗モードは tests/unit/planClaudeClient.test.ts 側でカバーしている

  it('Claude APIの応答がスキーマに一致しない場合は502を返す', async () => {
    mockGeneratePlan.mockResolvedValue({
      result: { intent: {}, candidates: [] },
      usage: { inputTokens: 10, outputTokens: 5 },
      model: 'claude-sonnet-5',
    })

    const res = createMockRes()
    await handler(createReq('POST', { message: 'ランチしたい' }), res)

    expect(res.statusCode).toBe(502)
    expect((res.body as { error: string }).error).toBe('validation_error')
  })

  it('claudeClient.tsがPlanResponseParseErrorを投げた場合は502 invalid_ai_responseを返す（Issue #118）', async () => {
    mockGeneratePlan.mockRejectedValue(new PlanResponseParseError())

    const res = createMockRes()
    await handler(createReq('POST', { message: 'ランチしたい' }), res)

    expect(res.statusCode).toBe(502)
    expect((res.body as { error: string }).error).toBe('invalid_ai_response')
  })

  it('claudeClient.tsがPlanGenerationErrorを投げた場合はuserMessageを502レスポンスに使う（Issue #117）', async () => {
    mockGeneratePlan.mockRejectedValue(
      new PlanGenerationError('プラン生成が混み合っています。少し待ってもう一度お試しください')
    )

    const res = createMockRes()
    await handler(createReq('POST', { message: 'ランチしたい' }), res)

    expect(res.statusCode).toBe(502)
    expect((res.body as { error: string; message: string }).error).toBe('claude_api_error')
    expect((res.body as { error: string; message: string }).message).toContain('混み合っています')
  })

  it('Claude API呼び出し自体が失敗した場合（未分類のエラー）は502 claude_api_errorを、内部のエラー詳細を含めずに返す', async () => {
    mockGeneratePlan.mockRejectedValue(new Error('ANTHROPIC_API_KEY が設定されていません'))

    const res = createMockRes()
    await handler(createReq('POST', { message: 'ランチしたい' }), res)

    expect(res.statusCode).toBe(502)
    // 内部の生エラーメッセージ（ANTHROPIC_API_KEY が設定されていません）をそのまま
    // クライアントに返さないことを確認する（Issue #117の内部詳細リーク修正）
    expect((res.body as { message: string }).message).not.toContain('ANTHROPIC_API_KEY')
    expect((res.body as { error: string }).error).toBe('claude_api_error')
  })
})
