import { useState } from 'react'
import StarRating from './StarRating'
import { Modal } from './Modal'
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
    <Modal title="レビューを書く" onClose={onClose} zIndex="z-50">
      {showSuccess ? (
        <div className="text-center py-6">
          <p className="text-lg font-extrabold text-leaf-600">🌱 レビューを投稿しました</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <StarRating rating={rating} onChange={setRating} size="lg" />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, REVIEW_COMMENT_MAX_LENGTH))}
            rows={4}
            placeholder="お店の感想を書いてください"
            className="ac-input text-sm mb-1 resize-none"
          />
          <p className="text-xs text-wood-400 text-right mb-4">
            {comment.length} / {REVIEW_COMMENT_MAX_LENGTH}
          </p>

          {error && (
            <div className="mb-3 rounded-2xl border-2 border-bubble-200 bg-bubble-50 p-3">
              <p className="text-sm font-bold text-bubble-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="ac-btn-ghost text-sm">
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="ac-btn-primary text-sm"
            >
              {isSubmitting ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
