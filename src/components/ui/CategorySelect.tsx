export function CategorySelect({
  categories,
  value,
  onChange,
  className = '',
}: {
  categories: string[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`ac-input !w-auto ${className}`.trim()}>
      <option value="all">すべてのカテゴリ</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}
