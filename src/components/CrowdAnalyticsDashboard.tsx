import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { Modal } from './Modal'

type CongestionLevel = 'low' | 'medium' | 'high'

interface CrowdAnalyticsRow {
  datePeriod: string
  levelDistribution: Record<CongestionLevel, number>
  peakHour: number | null
  peakLevel: CongestionLevel | null
  totalUpdates: number
}

const LEVEL_VALUE: Record<CongestionLevel, number> = { low: 0, medium: 1, high: 2 }
const LEVEL_LABEL: Record<CongestionLevel, string> = { low: '空いている', medium: '普通', high: '混雑' }
const LEVEL_COLOR: Record<CongestionLevel, string> = { low: 'bg-leaf-500', medium: 'bg-sand-500', high: 'bg-bubble-500' }
const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土']

const RANGE_OPTIONS = [
  { label: '直近7日', days: 7 },
  { label: '週別', days: 28 },
  { label: '月別', days: 90 },
] as const

function computeAverageLevel(rows: CrowdAnalyticsRow[]): number | null {
  let weightedSum = 0
  let total = 0
  for (const row of rows) {
    for (const level of Object.keys(row.levelDistribution) as CongestionLevel[]) {
      const count = row.levelDistribution[level]
      weightedSum += LEVEL_VALUE[level] * count
      total += count
    }
  }
  return total > 0 ? weightedSum / total : null
}

function computeMostCrowded(rows: CrowdAnalyticsRow[]): { label: string; level: CongestionLevel } | null {
  const withPeak = rows.filter((r) => r.peakHour !== null && r.peakLevel !== null)
  const highest = ['high', 'medium', 'low'] as const
  for (const level of highest) {
    const candidates = withPeak.filter((r) => r.peakLevel === level)
    if (candidates.length === 0) continue

    const counts = new Map<string, number>()
    for (const row of candidates) {
      const weekday = WEEKDAY_LABEL[new Date(`${row.datePeriod}T00:00:00Z`).getUTCDay()]
      const key = `${weekday}|${row.peakHour}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    let bestKey = ''
    let bestCount = -1
    for (const [key, count] of counts) {
      if (count > bestCount) {
        bestKey = key
        bestCount = count
      }
    }

    const [weekday, hour] = bestKey.split('|')
    return { label: `${weekday}曜 ${hour}時`, level }
  }
  return null
}

function computeHourlyFrequency(rows: CrowdAnalyticsRow[]): { hour: number; count: number; level: CongestionLevel | null }[] {
  const buckets: { count: number; levelCounts: Record<CongestionLevel, number> }[] = Array.from(
    { length: 24 },
    () => ({ count: 0, levelCounts: { low: 0, medium: 0, high: 0 } }),
  )

  for (const row of rows) {
    if (row.peakHour === null || row.peakLevel === null) continue
    buckets[row.peakHour].count += 1
    buckets[row.peakHour].levelCounts[row.peakLevel] += 1
  }

  return buckets.map((bucket, hour) => {
    let dominant: CongestionLevel | null = null
    let dominantCount = 0
    for (const level of ['low', 'medium', 'high'] as CongestionLevel[]) {
      if (bucket.levelCounts[level] > dominantCount) {
        dominant = level
        dominantCount = bucket.levelCounts[level]
      }
    }
    return { hour, count: bucket.count, level: dominant }
  })
}

export function CrowdAnalyticsDashboard({
  storeId,
  storeName,
  onClose,
}: {
  storeId: string
  storeName: string
  onClose: () => void
}) {
  const [rangeDays, setRangeDays] = useState<number>(7)
  const [rows, setRows] = useState<CrowdAnalyticsRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.get<{ data: CrowdAnalyticsRow[] }>(
          `/api/analytics/crowd/${storeId}?days=${rangeDays}`,
        )
        if (!cancelled) setRows(res.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '混雑分析データの取得に失敗しました')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [storeId, rangeDays])

  const averageLevel = computeAverageLevel(rows)
  const mostCrowded = computeMostCrowded(rows)
  const hourly = computeHourlyFrequency(rows)
  const maxCount = Math.max(1, ...hourly.map((h) => h.count))

  return (
    <Modal title={`混雑パターン分析 - ${storeName}`} onClose={onClose} maxWidth="max-w-3xl">
      <div className="mb-4 flex gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setRangeDays(opt.days)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
              rangeDays === opt.days
                ? 'bg-leaf-500 text-white shadow-ac-sm'
                : 'bg-sand-100 text-wood-600 hover:bg-sand-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm font-bold text-wood-500">読み込み中...</p>
      ) : error ? (
        <p className="text-sm font-bold text-bubble-600">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-wood-400">
          集計データがありません。混雑報告が集まり次第、翌日以降に反映されます。
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="ac-card-sm">
              <p className="text-xs font-bold text-wood-500">平均混雑度</p>
              <p className="text-2xl font-extrabold text-wood-800">
                {averageLevel !== null ? averageLevel.toFixed(1) : '-'}
              </p>
              <p className="text-xs text-wood-400">0: 空いている 〜 2: 混雑</p>
            </div>
            <div className="ac-card-sm">
              <p className="text-xs font-bold text-wood-500">最も混む時間帯</p>
              <p className="text-2xl font-extrabold text-wood-800">{mostCrowded?.label ?? '-'}</p>
              {mostCrowded && (
                <p className="text-xs text-wood-400">{LEVEL_LABEL[mostCrowded.level]}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {hourly.map(({ hour, count, level }) => (
              <div key={hour} className="flex items-center gap-2 text-xs">
                <span className="w-10 flex-shrink-0 text-right text-wood-500">{hour}時</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-sand-100">
                  {count > 0 && (
                    <div
                      className={`h-full ${level ? LEVEL_COLOR[level] : 'bg-sand-300'}`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  )}
                </div>
                <span className="w-6 flex-shrink-0 text-wood-500">{count || ''}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
