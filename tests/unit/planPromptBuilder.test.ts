// buildPlanPrompt自体は純粋関数だが、promptBuilder.tsがbackend/dbに依存するモジュールを
// import しているため、他のunitテスト（authz.test.ts等）と同様にモックが必要
jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { buildPlanPrompt } from '../../backend/domains/plan/promptBuilder'
import type { StoreContext } from '../../backend/domains/plan/promptBuilder'

const STORE: StoreContext = {
  id: 'store-1',
  name: 'のんびり亭',
  category: '定食屋・ランチ',
  x: -100,
  y: 30,
  open_time: '11:00',
  close_time: '21:00',
  price_min: 900,
  price_max: 1300,
  distanceTag: 'near',
  rating: 4.2,
  crowdText: 'のんびり亭: 現在空いている（想定（事前設定））',
  score: 0.82,
}

describe('buildPlanPrompt', () => {
  it('店舗一覧・ユーザー要望・出力形式指示をすべて1つのプロンプトに含める（Claude API呼び出しは1回に統合）', () => {
    const prompt = buildPlanPrompt({ message: 'ランチして映画も見たい' }, [STORE])

    expect(prompt).toContain('のんびり亭')
    expect(prompt).toContain('店舗ID: store-1')
    expect(prompt).toContain('ランチして映画も見たい')
    expect(prompt).toContain('"candidates"')
    expect(prompt).toContain('距離感=近い')
  })

  it('制約条件（人数・予算・時刻）がある場合はプロンプトに含める', () => {
    const prompt = buildPlanPrompt(
      { message: '子連れでのんびりしたい', party_size: 3, budget: 3000, time_limit: '15:00' },
      [STORE]
    )

    expect(prompt).toContain('人数: 3名')
    expect(prompt).toContain('予算: ¥3000以内')
    expect(prompt).toContain('15:00まで')
  })

  it('制約条件が無い場合は制約条件セクションを含めない', () => {
    const prompt = buildPlanPrompt({ message: 'カフェに行きたい' }, [STORE])

    expect(prompt).not.toContain('## 制約条件')
  })
})
