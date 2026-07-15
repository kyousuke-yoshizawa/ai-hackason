export default function Flower({
  className = '',
  color = '#ff8fb8',
  center = '#ffd07d',
}: {
  className?: string
  color?: string
  center?: string
}) {
  const petals = Array.from({ length: 5 })
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g transform="translate(32,32)">
        {petals.map((_, i) => (
          <ellipse key={i} cx="0" cy="-16" rx="9" ry="14" fill={color} transform={`rotate(${(360 / 5) * i})`} />
        ))}
        <circle r="8" fill={center} />
      </g>
    </svg>
  )
}
