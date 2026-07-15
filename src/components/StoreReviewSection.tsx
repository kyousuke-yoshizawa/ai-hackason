import { useCallback, useEffect, useState } from 'react'
import ReviewList from './ReviewList'
import ReviewFormModal from './ReviewFormModal'
import { useAuth } from '../context/AuthContext'
import {
  createReview,
  deleteReview,
  getStoreReviews,
  getStoreReviewStats,
  updateReview,
} from '../lib/reviews'
import type { ReviewStats, ReviewWithUser } from '../types/social'

interface StoreReviewSectionProps {
  storeId: string
}

const EMPTY_STATS: ReviewStats = { store_id: '', avg_rating: 0, review_count: 0, last_updated: '' }

export default function StoreReviewSection({ storeId }: StoreReviewSectionProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ReviewWithUser[]>([])
  const [stats, setStats] = useState<ReviewStats>(EMPTY_STATS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<ReviewWithUser | null>(null)

  const reload = useCallback(async () => {
    const [reviewsResult, statsResult] = await Promise.all([
      getStoreReviews(storeId),
      getStoreReviewStats(storeId),
    ])
    if (reviewsResult.success) setReviews(reviewsResult.reviews)
    if (statsResult.success) setStats(statsResult.stats)
  }, [storeId])

  useEffect(() => {
    reload()
  }, [reload])

  const openNewReview = () => {
    setEditingReview(null)
    setIsModalOpen(true)
  }

  const openEditReview = (review: ReviewWithUser) => {
    setEditingReview(review)
    setIsModalOpen(true)
  }

  const handleSubmit = async (rating: number, comment: string) => {
    if (!user) return { success: false, message: 'ログインが必要です' }

    const result = editingReview
      ? await updateReview(editingReview.id, user.id, rating, comment)
      : await createReview(user.id, storeId, rating, comment)

    if (result.success) await reload()
    return result
  }

  const handleDelete = async (reviewId: string) => {
    if (!user) return
    const result = await deleteReview(reviewId, user.id, user.role === 'admin')
    if (result.success) await reload()
  }

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">レビュー</h3>
          <p className="text-sm text-gray-600" data-testid="average-rating">
            評価 {stats.avg_rating.toFixed(1)} / 5（{stats.review_count}件のレビュー）
          </p>
        </div>
        <button
          type="button"
          onClick={openNewReview}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          レビューを書く
        </button>
      </div>

      <ReviewList
        reviews={reviews}
        currentUserId={user?.id}
        isAdmin={user?.role === 'admin'}
        onEdit={openEditReview}
        onDelete={handleDelete}
      />

      <ReviewFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialRating={editingReview?.rating ?? 0}
        initialComment={editingReview?.comment ?? ''}
      />
    </section>
  )
}
