export type SortDirection = 'asc' | 'desc'

interface SortableHeaderProps<K extends string> {
  label: string
  sortKey: K
  currentSortKey: K
  currentSortDir: SortDirection
  onSort: (key: K) => void
}

function SortIndicatorButton<K extends string>({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
}: SortableHeaderProps<K>) {
  const isActive = currentSortKey === sortKey
  const arrow = isActive ? (currentSortDir === 'asc' ? '▲' : '▼') : ''

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 hover:text-gray-900"
    >
      {label}
      <span className="text-xs">{arrow}</span>
    </button>
  )
}

export function SortableHeader<K extends string>(props: SortableHeaderProps<K>) {
  return (
    <th className="px-4 py-2">
      <SortIndicatorButton {...props} />
    </th>
  )
}

// div/gridベースのレイアウト（<table>を使わない画面）向け。<th>でラップしないため、
// grid内の見出しspan/divの中にそのまま置ける。
export function SortableColumnLabel<K extends string>(props: SortableHeaderProps<K>) {
  return <SortIndicatorButton {...props} />
}
