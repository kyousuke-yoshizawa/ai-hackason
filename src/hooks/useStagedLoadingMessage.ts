import { useEffect, useState } from 'react'

// Issue #144: プラン生成中、経過時間に応じてローディングメッセージを段階的に切り替える
// （3秒超の待ち時間の体感補完。実測はIssue #148参照）
const STAGES = [
  { afterMs: 0, message: 'ご要望を読み取っています…' },
  { afterMs: 2000, message: 'ことこと町のお店を調べています…' },
  { afterMs: 5000, message: '素敵なプランを考えています…もう少しだけお待ちください' },
] as const

export function useStagedLoadingMessage(isActive: boolean): string {
  const [message, setMessage] = useState<string>(STAGES[0].message)

  useEffect(() => {
    if (!isActive) {
      setMessage(STAGES[0].message)
      return
    }

    const timers = STAGES.slice(1).map((stage) =>
      setTimeout(() => setMessage(stage.message), stage.afterMs)
    )

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [isActive])

  return message
}
