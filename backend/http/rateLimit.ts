// ユーザー単位の簡易レート制限（インメモリ・固定ウィンドウ方式）。
// Vercel Functionsはインスタンスごとにメモリが分かれるため厳密なグローバル制限ではないが、
// 連打・バグによるコスト暴走の抑止という目的には十分。DBベースにしないのは、
// リクエストのたびにレイテンシが増えることと、テーブル追加のコストを避けるため。
const buckets = new Map<string, { count: number; windowStart: number }>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSec: number
}

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): RateLimitResult {
  const now = Date.now()

  // チェックのたびに期限切れエントリを掃除し、Mapの肥大化を防ぐ
  for (const [bucketKey, bucket] of buckets) {
    if (now - bucket.windowStart >= windowMs) {
      buckets.delete(bucketKey)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (bucket.count < limit) {
    bucket.count += 1
    return { allowed: true, retryAfterSec: 0 }
  }

  const retryAfterSec = Math.ceil((bucket.windowStart + windowMs - now) / 1000)
  return { allowed: false, retryAfterSec }
}
