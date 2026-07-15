import StarRating from './StarRating'
import type { ReviewWithUser } from '../types/social'

interface ReviewListProps {
  reviews: ReviewWithUser[]
  currentUserId?: string
  isAdmin?: boolean
  onEdit?: (review: ReviewWithUser) => void
  onDelete?: (reviewId: string) => void
}

export default function ReviewList({ reviews, currentUserId, isAdmin, onEdit, onDelete }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p className="text-sm font-bold text-wood-500">まだレビューがありません</p>
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => {
        const isOwner = !!currentUserId && review.user_id === currentUserId

        return (
          <li key={review.id} className="border-b-2 border-sand-200 pb-4 last:border-b-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-wood-800">{review.users?.name ?? '匿名ユーザー'}</p>
                <StarRating rating={review.rating} size="sm" />
              </div>
              <span className="text-xs text-wood-400">
                {new Date(review.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>

            {review.comment && <p className="text-sm text-wood-600 mt-2">{review.comment}</p>}

            {(isOwner || isAdmin) && (
              <div className="flex gap-3 mt-2">
                {isOwner && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(review)}
                    className="text-xs font-bold text-leaf-600 hover:underline"
                  >
                    編集
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(review.id)}
                    className="text-xs font-bold text-bubble-600 hover:underline"
                  >
                    削除
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
