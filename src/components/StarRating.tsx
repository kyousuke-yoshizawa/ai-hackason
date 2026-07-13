interface StarRatingProps {
  rating: number
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

export default function StarRating({ rating, onChange, size = 'md' }: StarRatingProps) {
  const interactive = !!onChange

  return (
    <div
      className={`flex gap-0.5 ${SIZE_CLASSES[size]}`}
      role={interactive ? 'radiogroup' : undefined}
      aria-label="評価"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} ${
            star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'
          }`}
          aria-label={`${star}つ星`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
