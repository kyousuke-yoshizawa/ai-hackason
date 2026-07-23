// 複数画面に重複していたエラーバナー（bubbleスタイル）を集約する（Issue #107）。
// StoreMediaPanelのみ横paddingが px-3（他画面は px-4）のため className で上書きできるようにしている。
export function ErrorBanner({
  message,
  className = 'mb-4 rounded-2xl border-2 border-bubble-200 bg-bubble-50 px-4 py-2 text-sm font-bold text-bubble-700',
}: {
  message: string
  className?: string
}) {
  return <p className={className}>{message}</p>
}
