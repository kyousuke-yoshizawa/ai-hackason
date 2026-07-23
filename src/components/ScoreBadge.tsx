interface ScoreBadgeProps {
  score: number
}

// Issue #140: スコア（0〜1の小数）を直感的なバー表示に変換する。
// 0.8以上=緑（十分おすすめ）、0.6〜0.8=黄（まずまず）、0.6未満=グレー（参考程度）の3段階
function colorClass(clamped: number): string {
  if (clamped >= 0.8) return 'bg-leaf-500'
  if (clamped >= 0.6) return 'bg-yellow-400'
  return 'bg-wood-300'
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const clamped = Math.min(1, Math.max(0, score))
  const percent = Math.round(clamped * 100)

  return (
    <div
      className="flex items-center gap-2"
      title="距離感・評価・混雑度・オファーをもとに算出しています"
      data-testid="score-badge"
    >
      <div className="h-2 w-20 overflow-hidden rounded-full bg-sand-100">
        <div
          data-testid="score-bar"
          className={`h-full rounded-full ${colorClass(clamped)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-bold text-wood-600">おすすめ度 {percent}%</span>
    </div>
  )
}
