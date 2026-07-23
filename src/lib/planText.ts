import type { PlanCandidate } from '../types/plan'

// Issue #142: 生成したプランをLINE等に貼れる整形テキストに変換する
export function formatPlanAsText(candidate: PlanCandidate): string {
  const sortedStops = [...candidate.stops].sort((a, b) => a.start_time.localeCompare(b.start_time))

  const lines = [`🌿 ことこと町おでかけプラン（${candidate.label}）`]

  sortedStops.forEach((stop, index) => {
    if (index > 0 && stop.travel_note) {
      lines.push(`↓ ${stop.travel_note}`)
    }
    lines.push(`${toCircledNumber(index + 1)} ${stop.start_time}-${stop.end_time} ${stop.store_name}`)
    if (stop.reason) {
      lines.push(`   ${stop.reason}`)
    }
  })

  if (candidate.summary) {
    lines.push('', candidate.summary)
  }

  return lines.join('\n')
}

const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

function toCircledNumber(n: number): string {
  return CIRCLED_NUMBERS[n - 1] ?? `(${n})`
}
