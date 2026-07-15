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
      data-testid="like-button"
      onClick={handleClick}
      disabled={isBusy}
      className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-60"
      aria-pressed={liked}
      aria-label={liked ? 'いいねを解除する' : 'いいねする'}
    >
      <span className={liked ? 'text-bubble-500' : 'text-wood-300'}>♥</span>
      <span className={liked ? 'text-bubble-600' : 'text-wood-500'} data-testid="like-count">
        {count}
      </span>
    </button>
  )
}
