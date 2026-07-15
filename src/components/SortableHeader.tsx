export type SortDirection = 'asc' | 'desc'

interface SortableHeaderProps<K extends string> {
  label: string
  sortKey: K
  currentSortKey: K
  currentSortDir: SortDirection
  onSort: (key: K) => void
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
}: SortableHeaderProps<K>) {
  const isActive = currentSortKey === sortKey
  const arrow = isActive ? (currentSortDir === 'asc' ? '▲' : '▼') : ''

  return (
    <th className="px-4 py-2 text-left font-medium text-gray-600">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-gray-900"
      >
        {label}
        <span className="text-xs">{arrow}</span>
      </button>
    </th>
  )
}
