import { useState } from 'react'
import StarRating from './StarRating'
import { REVIEW_COMMENT_MAX_LENGTH } from '../lib/reviews'
import type { ApiResult } from '../types/social'

interface ReviewFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (rating: number, comment: string) => Promise<ApiResult>
  initialRating?: number
  initialComment?: string
}

export default function ReviewFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialRating = 0,
  initialComment = '',
}: ReviewFormModalProps) {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('評価を選択してください')
      return
    }
    setError(null)
    setIsSubmitting(true)

    const result = await onSubmit(rating, comment)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.message ?? '投稿に失敗しました')
      return
    }

    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        {showSuccess ? (
          <div className="text-center py-6">
            <p className="text-lg font-medium text-green-600">レビューを投稿しました</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4">レビューを書く</h2>

            <div className="mb-4">
              <StarRating rating={rating} onChange={setRating} size="lg" />
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, REVIEW_COMMENT_MAX_LENGTH))}
              rows={4}
              placeholder="お店の感想を書いてください"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-1 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mb-4">
              {comment.length} / {REVIEW_COMMENT_MAX_LENGTH}
            </p>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {isSubmitting ? '投稿中...' : '投稿する'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
