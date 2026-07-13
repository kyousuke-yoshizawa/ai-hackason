import { useEffect, useState } from 'react'
import { addLike, isStoreLikedByUser, removeLikeByStore } from '../lib/likes'

interface LikeButtonProps {
  userId: string
  storeId: string
  initialCount?: number
}

export default function LikeButton({ userId, storeId, initialCount = 0 }: LikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    isStoreLikedByUser(userId, storeId).then((result) => {
      if (!cancelled) setLiked(result.liked)
    })
    return () => {
      cancelled = true
    }
  }, [userId, storeId])

  const handleClick = async () => {
    if (isBusy) return
    setIsBusy(true)

    const nextLiked = !liked
    setLiked(nextLiked)
    setCount((c) => c + (nextLiked ? 1 : -1))

    const result = nextLiked
      ? await addLike(userId, storeId)
      : await removeLikeByStore(userId, storeId)

    if (!result.success) {
      setLiked(!nextLiked)
      setCount((c) => c - (nextLiked ? 1 : -1))
    }

    setIsBusy(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-60"
      aria-pressed={liked}
      aria-label={liked ? 'いいねを解除する' : 'いいねする'}
    >
      <span className={liked ? 'text-red-500' : 'text-gray-400'}>♥</span>
      <span className={liked ? 'text-red-600' : 'text-gray-600'}>{count}</span>
    </button>
  )
}
