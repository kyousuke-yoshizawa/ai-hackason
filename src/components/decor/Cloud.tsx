export default function Cloud({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden="true">
      <ellipse cx="30" cy="38" rx="26" ry="18" fill="white" />
      <ellipse cx="60" cy="26" rx="32" ry="24" fill="white" />
      <ellipse cx="92" cy="38" rx="24" ry="16" fill="white" />
      <ellipse cx="60" cy="44" rx="46" ry="16" fill="white" />
    </svg>
  )
}
