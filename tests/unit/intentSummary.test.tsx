import { render, screen } from '@testing-library/react'
import { IntentSummary } from '../../src/components/IntentSummary'
import type { PlanIntent } from '../../src/types/plan'

describe('IntentSummary', () => {
  it('desires・人数・予算・時間制限のバッジを表示する', () => {
    const intent: PlanIntent = {
      desires: ['ランチ', '映画'],
      party_size: 2,
      budget: 3000,
      time_limit: '15:00',
    }

    render(<IntentSummary intent={intent} />)

    expect(screen.getByText(/ランチ/)).toBeTruthy()
    expect(screen.getByText(/映画/)).toBeTruthy()
    expect(screen.getByText('👥 2人')).toBeTruthy()
    expect(screen.getByText('💰 ¥3,000以内')).toBeTruthy()
    expect(screen.getByText('🕒 15:00まで')).toBeTruthy()
  })

  it('nullの項目はバッジを表示しない', () => {
    const intent: PlanIntent = {
      desires: ['ランチ'],
      party_size: null,
      budget: null,
      time_limit: null,
    }

    render(<IntentSummary intent={intent} />)

    expect(screen.queryByText(/人$/)).toBeNull()
    expect(screen.queryByText(/以内/)).toBeNull()
    expect(screen.queryByText(/まで/)).toBeNull()
  })

  it('desiresが空配列かつ他が全てnullのときは何も表示しない', () => {
    const intent: PlanIntent = { desires: [], party_size: null, budget: null, time_limit: null }

    const { container } = render(<IntentSummary intent={intent} />)

    expect(container.querySelector('[data-testid="intent-summary"]')).toBeNull()
  })
})
