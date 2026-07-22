import type { CongestionLevel } from '../../shared/types/crowd'

// day: 0=日曜〜6=土曜（CrowdPatternGrid.tsx / backend/domains/crowd/schema.ts と同じ規約）
export interface CrowdPreset {
  label: string
  cells: (day: number, hour: number) => CongestionLevel | null
}

const isWeekday = (day: number) => day >= 1 && day <= 5
const isWeekend = (day: number) => day === 0 || day === 6

// Issue #133: 「ランチどきが混む」等の典型パターンを1クリックで反映するプリセット。
// 各プリセットは「他は普通」を仕様としているため cells() は常に low/medium/high の
// いずれかを返し、null（グリッドの未設定セルに相当）は返さない。
export const CROWD_PRESETS: CrowdPreset[] = [
  {
    label: 'ランチピーク型',
    cells: (day, hour) => {
      if (isWeekday(day) && hour === 12) return 'high'
      if (isWeekend(day) && (hour === 12 || hour === 13)) return 'high'
      return 'medium'
    },
  },
  {
    label: '週末カフェ型',
    cells: (day, hour) => {
      if (isWeekend(day) && hour >= 14 && hour <= 16) return 'high'
      if (isWeekday(day) && (hour === 14 || hour === 15)) return 'low'
      return 'medium'
    },
  },
  {
    label: '夜型（映画館等）',
    cells: (day, hour) => {
      if (isWeekend(day) && hour >= 17 && hour <= 20) return 'high'
      if (isWeekday(day) && hour >= 10 && hour <= 15) return 'low'
      return 'medium'
    },
  },
  {
    label: '朝夕2山型',
    cells: (day, hour) => {
      // 11:30-14:00 / 17:30-19:30 は1時間単位のグリッドに合わせ、重なる時間帯を丸めて対象にする
      if (isWeekend(day) && ((hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 19))) return 'high'
      if (isWeekday(day) && hour >= 14 && hour <= 16) return 'low'
      return 'medium'
    },
  },
]
