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
    return <p className="text-sm text-gray-500">まだレビューがありません</p>
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => {
        const isOwner = !!currentUserId && review.user_id === currentUserId

        return (
          <li key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900">{review.users?.name ?? '匿名ユーザー'}</p>
                <StarRating rating={review.rating} size="sm" />
              </div>
              <span className="text-xs text-gray-400">
                {new Date(review.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>

            {review.comment && <p className="text-sm text-gray-700 mt-2">{review.comment}</p>}

            {(isOwner || isAdmin) && (
              <div className="flex gap-3 mt-2">
                {isOwner && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(review)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    編集
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(review.id)}
                    className="text-xs text-red-600 hover:underline"
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
