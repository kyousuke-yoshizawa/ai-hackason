import type { PlanCandidate } from '../types/plan'

interface PlanCardProps {
  candidate: PlanCandidate
}

export default function PlanCard({ candidate }: PlanCardProps) {
  const sortedStops = [...candidate.stops].sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div className="ac-card" data-testid="plan-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold text-wood-800">{candidate.label}</h3>
        <span className="ac-btn-secondary !cursor-default !px-3 !py-1 text-xs">
          スコア {candidate.score}
        </span>
      </div>

      <p className="mb-4 text-sm text-wood-500">{candidate.summary}</p>

      {sortedStops.length === 0 ? (
        <p className="text-sm text-wood-400">立ち寄り先がありません</p>
      ) : (
        <ol className="space-y-3">
          {sortedStops.map((stop, index) => (
            <li key={`${stop.store_id}-${index}`} className="ac-card-sm" data-testid="plan-stop">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-wood-800" data-testid="plan-stop-name">
                  {stop.store_name}
                </p>
                <p className="text-xs font-bold text-leaf-600">
                  {stop.start_time} – {stop.end_time}
                </p>
              </div>
              {stop.travel_note && (
                <p className="mt-1 text-xs text-sky-600">{stop.travel_note}</p>
              )}
              {stop.reason && <p className="mt-1 text-xs text-wood-400">{stop.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
