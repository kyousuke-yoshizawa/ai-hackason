import { getCrowdPattern, getCurrentCrowdStatus } from './repository'
import type { CongestionLevel } from '../email/templates'

const FRESHNESS_WINDOW_MS = 30 * 60 * 1000 // 30分

export type CrowdLevelSource = 'live' | 'pattern' | 'unknown'

export interface CrowdLevelResult {
  level: CongestionLevel | null
  source: CrowdLevelSource
  updatedAt?: string
}

const LEVEL_LABEL: Record<CongestionLevel, string> = {
  low: '空いている',
  medium: '普通の混雑',
  high: '混雑している',
}

/**
 * 直近30分以内のリアルタイム報告（crowd_status）があれば優先し、
 * 無ければ時間帯別の事前設定パターン（crowd_patterns）にフォールバックする。
 * 将来の /api/plan（プラン生成API）から呼び出される想定の参照ロジック。
 */
export async function resolveCurrentCrowdLevel(
  storeId: string,
  now: Date = new Date(),
): Promise<CrowdLevelResult> {
  const status = await getCurrentCrowdStatus(storeId)
  if (status && now.getTime() - new Date(status.updatedAt).getTime() <= FRESHNESS_WINDOW_MS) {
    return { level: status.level, source: 'live', updatedAt: status.updatedAt }
  }

  const patternLevel = await getCrowdPattern(storeId, now.getHours())
  if (patternLevel) {
    return { level: patternLevel, source: 'pattern' }
  }

  return { level: null, source: 'unknown' }
}

/** Claude へのプラン生成プロンプトに埋め込む短い日本語の混雑情報テキストを生成する。 */
export function formatCrowdLevelForPrompt(storeName: string, result: CrowdLevelResult): string {
  if (!result.level) {
    return `${storeName}: 混雑情報なし`
  }

  const sourceLabel = result.source === 'live' ? 'リアルタイム報告' : '想定（事前設定）'
  return `${storeName}: 現在${LEVEL_LABEL[result.level]}（${sourceLabel}）`
}
