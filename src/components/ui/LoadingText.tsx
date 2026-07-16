// 全リスト画面に重複していた読み込み中テキストを集約する（Issue #107）。
// 大半の画面は text-wood-500 だが、一部（UserManagementPanel）だけ
// text-wood-400 のため className で上書きできるようにしている。
export function LoadingText({ className = 'text-sm font-bold text-wood-500' }: { className?: string }) {
  return <p className={className}>読み込み中...</p>
}
