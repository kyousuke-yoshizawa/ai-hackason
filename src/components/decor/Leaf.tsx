export default function Leaf({
  className = '',
  color = '#63a52f',
}: {
  className?: string
  color?: string
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 4C14 4 4 18 4 34c0 14 12 26 28 26s28-12 28-26C60 18 50 4 32 4Z" fill={color} />
      <path
        d="M32 12v40M18 24c6 4 10 10 14 16M46 24c-6 4-10 10-14 16"
        stroke="#2a4719"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
    </svg>
  )
}
