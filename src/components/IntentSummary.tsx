import { iconForDesire } from '../lib/desireIcons'
import type { PlanIntent } from '../types/plan'

interface IntentSummaryProps {
  intent: PlanIntent
  onRequestEdit?: () => void
}

export function IntentSummary({ intent, onRequestEdit }: IntentSummaryProps) {
  const hasAnyBadge =
    intent.desires.length > 0 ||
    intent.party_size != null ||
    intent.budget != null ||
    intent.time_limit != null

  if (!hasAnyBadge) return null

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="intent-summary">
      <span className="text-xs font-bold text-wood-500">こういうご要望ですね:</span>

      {intent.desires.map((desire, index) => (
        <span key={`${desire}-${index}`} className="ac-badge bg-leaf-100 text-leaf-700">
          {iconForDesire(desire)} {desire}
        </span>
      ))}

      {intent.party_size != null && (
        <span className="ac-badge bg-sky-100 text-sky-700">👥 {intent.party_size}人</span>
      )}

      {intent.budget != null && (
        <span className="ac-badge bg-sand-200 text-wood-700">💰 ¥{intent.budget.toLocaleString()}以内</span>
      )}

      {intent.time_limit != null && (
        <span className="ac-badge bg-bubble-100 text-bubble-700">🕒 {intent.time_limit}まで</span>
      )}

      {onRequestEdit && (
        <button
          type="button"
          onClick={onRequestEdit}
          className="text-xs font-bold text-wood-400 underline hover:text-wood-600"
        >
          違うかも？
        </button>
      )}
    </div>
  )
}
