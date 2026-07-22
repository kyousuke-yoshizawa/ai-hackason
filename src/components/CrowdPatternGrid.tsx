import { useEffect, useState } from 'react'
import { getCrowdPatterns, replaceCrowdPatterns } from '../lib/crowdPatterns'
import type { CrowdPatternEntry } from '../lib/crowdPatterns'
import { CROWD_PRESETS } from '../lib/crowdPresets'
import type { CrowdPreset } from '../lib/crowdPresets'
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

type CopyTarget = 'all' | 'weekday' | 'weekend'

const COPY_TARGET_LABEL: Record<CopyTarget, string> = {
  all: 'この行を全曜日にコピー',
  weekday: 'この行を平日（月〜金）にコピー',
  weekend: 'この行を土日にコピー',
}

// ROWS内で実際の曜日を持つ行（全曜日共通=null行を除く）のインデックス群。
// コピー先の判定にはROWSのインデックスではなくdayOfWeekの値を使う。
function rowIndicesForTarget(target: CopyTarget): number[] {
  return ROWS.reduce<number[]>((acc, row, index) => {
    if (row.dayOfWeek === null) return acc
    if (target === 'all') acc.push(index)
    else if (target === 'weekday' && row.dayOfWeek >= 1 && row.dayOfWeek <= 5) acc.push(index)
    else if (target === 'weekend' && (row.dayOfWeek === 0 || row.dayOfWeek === 6)) acc.push(index)
    return acc
  }, [])
}

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

  // プリセット適用はローカル状態の上書きのみ。「全曜日共通」行（dayOfWeek: null）は
  // プリセットの対象外（プリセットは日〜土の実曜日にのみ値を持つため）で変更しない。
  const handleApplyPreset = (preset: CrowdPreset) => {
    setGrid((prev) =>
      prev.map((row, rowIndex) => {
        const dayOfWeek = ROWS[rowIndex].dayOfWeek
        if (dayOfWeek === null) return row
        return HOURS.map((hour) => preset.cells(dayOfWeek, hour))
      })
    )
  }

  const handleCopyRow = (sourceRowIndex: number, target: CopyTarget) => {
    const targetRowIndices = rowIndicesForTarget(target)
    setGrid((prev) =>
      prev.map((row, rowIndex) => (targetRowIndices.includes(rowIndex) ? [...prev[sourceRowIndex]] : row))
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
      <div className="space-y-2">
        <p className="text-xs font-bold text-wood-500">プリセットを適用</p>
        <div className="flex flex-wrap gap-2">
          {CROWD_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="rounded-full border-2 border-leaf-300 bg-leaf-50 px-3 py-1.5 text-xs font-bold text-leaf-700 transition hover:bg-leaf-100 focus:outline-none focus:ring-2 focus:ring-leaf-300"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

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
              <th className="w-36 min-w-36 font-bold text-wood-500">行コピー</th>
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
                <td className="p-0">
                  {row.dayOfWeek === null ? null : (
                    <select
                      aria-label={`${row.label}の行を他の曜日にコピー`}
                      defaultValue=""
                      onChange={(event) => {
                        const target = event.target.value
                        if (target !== 'all' && target !== 'weekday' && target !== 'weekend') return
                        handleCopyRow(rowIndex, target)
                        event.target.value = ''
                      }}
                      className="w-full rounded border border-wood-200 bg-white px-1 py-1.5 text-[11px] font-bold text-wood-700 transition hover:bg-sand-50 focus:outline-none focus:ring-2 focus:ring-leaf-300"
                    >
                      <option value="" disabled>
                        コピー...
                      </option>
                      {(['all', 'weekday', 'weekend'] as CopyTarget[]).map((target) => (
                        <option key={target} value={target}>
                          {COPY_TARGET_LABEL[target]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
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
