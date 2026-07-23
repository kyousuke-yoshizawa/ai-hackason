import { useCallback, useEffect, useRef, useState } from 'react'

interface UseApiQueryOptions {
  // false の間はfetcherを実行しない（例: user未取得の間は待つ、等の既存ガード条件を再現する用途）
  enabled?: boolean
  // Error以外の例外（ApiError化されなかった想定外エラー等）の場合に表示する文言。
  // 画面ごとに従来の文言を保持するため（例: '店舗一覧の取得に失敗しました'）
  fallbackMessage?: string
}

interface UseApiQueryResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
}

// 全リスト画面に重複していた「setLoading(true) → try fetch → catch error → finally
// setLoading(false)」＋アンマウント後のsetState防止（cancelledフラグ）を集約する（Issue #107）。
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: UseApiQueryOptions
): UseApiQueryResult<T> {
  const enabled = options?.enabled ?? true
  const fallbackMessage = options?.fallbackMessage ?? '取得に失敗しました'
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      if (!cancelledRef.current) setData(result)
    } catch (err) {
      if (!cancelledRef.current) setError(err instanceof Error ? err.message : fallbackMessage)
    } finally {
      if (!cancelledRef.current) setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  useEffect(() => {
    cancelledRef.current = false
    load()
    return () => {
      cancelledRef.current = true
    }
  }, [load])

  return { data, isLoading, error, reload: load }
}
