import { useEffect, useState } from 'react'
import { getCrowdPatterns, replaceCrowdPatterns } from '../lib/crowdPatterns'
import type { CrowdPatternEntry } from '../lib/crowdPatterns'
import { CROWD_LEVEL_LABEL } from '../../shared/types/crowd'
import type { CongestionLevel } from '../../shared/types/crowd'

interface CrowdPatternGridProps {
  storeId: string
  onSaved?: () => void
  onError?: (message: string) => void
}

interface GridRow {
  dayOfWeek: number | null
  label: string
}

const ROWS: GridRow[] = [
  { dayOfWeek: null, label: '全曜日共通' },
  { dayOfWeek: 0, label: '日' },
  { dayOfWeek: 1, label: '月' },
  { dayOfWeek: 2, label: '火' },
  { dayOfWeek: 3, label: '水' },
  { dayOfWeek: 4, label: '木' },
  { dayOfWeek: 5, label: '金' },
  { dayOfWeek: 6, label: '土' },
]

const HOURS = Array.from({ length: 24 }, (_, h) => h)

const LEVEL_CYCLE: (CongestionLevel | null)[] = [null, 'low', 'medium', 'high']

const CELL_CLASS: Record<'empty' | CongestionLevel, string> = {
  empty: 'border-wood-200 bg-gray-100 text-gray-400 hover:bg-gray-200',
  low: 'border-leaf-300 bg-leaf-100 text-leaf-700 hover:bg-leaf-200',
  medium: 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200',
  high: 'border-bubble-300 bg-bubble-100 text-bubble-700 hover:bg-bubble-200',
}

const CELL_LABEL: Record<'empty' | CongestionLevel, string> = {
  empty: '',
  low: '空',
  medium: '普',
  high: '混',
}

function nextLevel(current: CongestionLevel | null): CongestionLevel | null {
  const currentIndex = LEVEL_CYCLE.indexOf(current)
  return LEVEL_CYCLE[(currentIndex + 1) % LEVEL_CYCLE.length]
}

function buildGrid(): (CongestionLevel | null)[][] {
  return ROWS.map(() => HOURS.map(() => null))
}

export function CrowdPatternGrid({ storeId, onSaved, onError }: CrowdPatternGridProps) {
  const [grid, setGrid] = useState<(CongestionLevel | null)[][]>(buildGrid())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      const result = await getCrowdPatterns(storeId)
      if (cancelled) return

      if (!result.success) {
        setLoadError(result.message ?? '混雑パターンの取得に失敗しました')
        setIsLoading(false)
        return
      }

      const next = buildGrid()
      for (const entry of result.patterns) {
        const rowIndex = ROWS.findIndex((row) => row.dayOfWeek === entry.day_of_week)
        if (rowIndex === -1) continue
        next[rowIndex][entry.hour_of_day] = entry.level
      }
      setGrid(next)
      setIsLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [storeId])

  const handleCellClick = (rowIndex: number, hour: number) => {
    setGrid((prev) =>
      prev.map((row, r) => (r === rowIndex ? row.map((cell, h) => (h === hour ? nextLevel(cell) : cell)) : row))
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    const patterns: CrowdPatternEntry[] = []
    grid.forEach((row, rowIndex) => {
      row.forEach((level, hour) => {
        if (level === null) return
        patterns.push({ day_of_week: ROWS[rowIndex].dayOfWeek, hour_of_day: hour, level })
      })
    })

    const result = await replaceCrowdPatterns(storeId, patterns)
    setIsSaving(false)

    if (result.success) {
      onSaved?.()
    } else {
      onError?.(result.message ?? '混雑パターンの保存に失敗しました')
    }
  }

  if (isLoading) {
    return <p className="text-sm font-bold text-wood-500">読み込み中...</p>
  }

  if (loadError) {
    return <p className="text-sm font-bold text-bubble-600">{loadError}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-wood-500">
        {(['low', 'medium', 'high'] as CongestionLevel[]).map((level) => (
          <span key={level} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded border ${CELL_CLASS[level]}`} />
            {CROWD_LEVEL_LABEL[level]}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded border ${CELL_CLASS.empty}`} />
          未設定
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-2 text-left text-wood-500">曜日 \ 時</th>
              {HOURS.map((hour) => (
                <th key={hour} className="w-8 min-w-8 font-bold text-wood-500">
                  {hour}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, rowIndex) => (
              <tr key={row.label}>
                <th className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 text-left font-bold text-wood-700">
                  {row.label}
                </th>
                {HOURS.map((hour) => {
                  const level = grid[rowIndex][hour]
                  const key = level ?? 'empty'
                  return (
                    <td key={hour} className="p-0">
                      <button
                        type="button"
                        onClick={() => handleCellClick(rowIndex, hour)}
                        aria-label={`${row.label} ${hour}時 ${level ? CROWD_LEVEL_LABEL[level] : '未設定'}`}
                        className={`h-7 w-8 rounded border font-bold transition focus:outline-none focus:ring-2 focus:ring-leaf-300 ${CELL_CLASS[key]}`}
                      >
                        {CELL_LABEL[key]}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={isSaving} className="ac-btn-primary !px-4 !py-2 text-sm">
          {isSaving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  )
}
