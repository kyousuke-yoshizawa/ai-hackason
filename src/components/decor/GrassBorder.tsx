import { useId } from 'react'

export default function GrassBorder({
  className = '',
  color = '#4c8523',
}: {
  className?: string
  color?: string
}) {
  const patternId = useId()

  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={className} aria-hidden="true">
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
        <polygon points="0,10 5,0 10,10" fill={color} />
      </pattern>
      <rect width="100" height="10" fill={`url(#${patternId})`} />
    </svg>
  )
}
