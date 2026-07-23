import type { PlanCandidate, PlanStop } from '../types/plan'
import { calculateBudgetSummary, getBudgetStatus } from '../lib/planBudget'

interface StoreRef {
  id: string
}

interface ReserveParams {
  storeId: string
  storeName: string
  time: string
  partySize: number
}

interface PlanCardProps {
  candidate: PlanCandidate
  stores?: StoreRef[]
  partySize?: number | null
  budget?: number | null
  onReserve?: (params: ReserveParams) => void
}

// #97: rating/open_time・close_time/crowd_note/offer_noteはnull・空文字の場合は表示しない
function buildStopChips(stop: PlanStop): { key: string; label: string; className: string }[] {
  const chips: { key: string; label: string; className: string }[] = []

  if (stop.rating != null) {
    chips.push({ key: 'rating', label: `★${stop.rating}`, className: 'ac-badge bg-sand-100 text-wood-700' })
  }
  if (stop.open_time && stop.close_time) {
    chips.push({
      key: 'hours',
      label: `営業 ${stop.open_time}–${stop.close_time}`,
      className: 'ac-badge bg-sky-100 text-sky-700',
    })
  }
  if (stop.crowd_note) {
    chips.push({ key: 'crowd', label: stop.crowd_note, className: 'ac-badge bg-wood-100 text-wood-600' })
  }
  if (stop.offer_note) {
    chips.push({ key: 'offer', label: stop.offer_note, className: 'ac-badge bg-bubble-100 text-bubble-700' })
  }

  return chips
}

export default function PlanCard({ candidate, stores = [], partySize, budget, onReserve }: PlanCardProps) {
  const sortedStops = [...candidate.stops].sort((a, b) => a.start_time.localeCompare(b.start_time))

  // #123: 価格が判明している立ち寄り先が1件もなければ概算行自体を出さない（¥0〜¥0の誤表示防止）
  const hasResolvablePrice = candidate.stops.some((stop) => stop.price_min != null && stop.price_max != null)
  const budgetSummary = calculateBudgetSummary(candidate.stops)
  const budgetStatus = getBudgetStatus(budgetSummary, budget)

  const handleReserve = (stop: PlanStop) => {
    onReserve?.({
      storeId: stop.store_id,
      storeName: stop.store_name,
      time: stop.start_time,
      partySize: partySize ?? 2,
    })
  }

  return (
    <div className="ac-card" data-testid="plan-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold text-wood-800">{candidate.label}</h3>
        <span className="ac-btn-secondary !cursor-default !px-3 !py-1 text-xs">
          スコア {candidate.score}
        </span>
      </div>

      <p className="mb-4 text-sm text-wood-500">{candidate.summary}</p>

      {hasResolvablePrice && (
        <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="plan-budget-summary">
          <p className="text-sm font-bold text-wood-700">
            💰 概算 ¥{budgetSummary.min}〜¥{budgetSummary.max} / 1人
          </p>
          {budgetSummary.hasUnknownPrice && (
            <span className="text-xs text-wood-400">※一部店舗の価格不明</span>
          )}
          {budgetStatus === 'over' && (
            <span className="ac-badge bg-bubble-100 text-bubble-700">予算オーバーの可能性</span>
          )}
          {budgetStatus === 'under' && <span className="ac-badge bg-leaf-100 text-leaf-700">予算内</span>}
        </div>
      )}

      {sortedStops.length === 0 ? (
        <p className="text-sm text-wood-400">立ち寄り先がありません</p>
      ) : (
        <ol className="space-y-3">
          {sortedStops.map((stop, index) => {
            const chips = buildStopChips(stop)
            const canReserve = onReserve != null && stores.some((s) => s.id === stop.store_id)

            return (
              <li key={`${stop.store_id}-${index}`} className="ac-card-sm" data-testid="plan-stop">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-wood-800" data-testid="plan-stop-name">
                    {stop.store_name}
                  </p>
                  <p className="text-xs font-bold text-leaf-600">
                    {stop.start_time} – {stop.end_time}
                  </p>
                </div>

                {chips.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5" data-testid="plan-stop-chips">
                    {chips.map((chip) => (
                      <span key={chip.key} className={chip.className}>
                        {chip.label}
                      </span>
                    ))}
                  </div>
                )}

                {stop.travel_note && (
                  <p className="mt-1 text-xs text-sky-600">{stop.travel_note}</p>
                )}
                {stop.reason && <p className="mt-1 text-xs text-wood-400">{stop.reason}</p>}

                {canReserve && (
                  <button
                    type="button"
                    onClick={() => handleReserve(stop)}
                    className="ac-btn-secondary mt-2 !px-3 !py-1 text-xs"
                  >
                    予約する
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
