import { useEffect, useState } from 'react'
import { generatePlan, summarizePlanForHistory } from '../lib/plan'
import { api } from '../lib/api'
import type { PlanCandidate } from '../types/plan'
import type { AdminStore } from '../components/StoreForm'
import PlanCard from '../components/PlanCard'
import MapView from '../components/MapView'
import Cloud from '../components/decor/Cloud'
import GrassBorder from '../components/decor/GrassBorder'

type Turn =
  | { role: 'user'; message: string }
  | { role: 'assistant'; candidates: PlanCandidate[] }

export default function PlanPage() {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0)
  const [stores, setStores] = useState<AdminStore[]>([])

  useEffect(() => {
    api
      .get<{ data: AdminStore[] }>('/api/stores')
      .then((res) => setStores(res.data))
      .catch(() => {
        // マップ用の座標補完に使うだけなので、取得失敗してもプラン生成自体は継続する
      })
  }, [])

  const handleSubmit = async () => {
    const trimmed = message.trim()
    if (!trimmed || isSubmitting) return

    const history = turns
      .map((turn) =>
        turn.role === 'user'
          ? { role: 'user' as const, content: turn.message }
          : { role: 'assistant' as const, content: summarizePlanForHistory(turn.candidates) }
      )
      .slice(-6)

    setIsSubmitting(true)
    setError(null)
    setTurns((prev) => [...prev, { role: 'user', message: trimmed }])

    const result = await generatePlan({ message: trimmed, history })

    if (result.success && result.plan) {
      setTurns((prev) => [...prev, { role: 'assistant', candidates: result.plan!.candidates }])
      setSelectedCandidateIndex(0)
      setMessage('')
    } else {
      setError(result.message ?? 'プラン生成に失敗しました')
    }

    setIsSubmitting(false)
  }

  const handleReset = () => {
    setTurns([])
    setSelectedCandidateIndex(0)
    setError(null)
  }

  const lastAssistantTurnIndex = turns.reduce(
    (acc, turn, index) => (turn.role === 'assistant' ? index : acc),
    -1
  )

  return (
    <>
      <header className="ac-header relative">
        <Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <h1 className="text-xl font-extrabold">AIお出かけプラン提案</h1>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      <main className="relative mx-auto max-w-4xl px-4 py-8">
        {turns.length > 0 && (
          <div className="mb-6 space-y-4">
            {turns.map((turn, index) => {
              if (turn.role === 'user') {
                return (
                  <div key={index} className="flex justify-end">
                    <p
                      className="ac-card-sm max-w-[80%] bg-sky-100 text-sm font-bold text-sky-800"
                      data-testid="plan-turn-user"
                    >
                      {turn.message}
                    </p>
                  </div>
                )
              }

              const isLatest = index === lastAssistantTurnIndex
              const selectedCandidate = isLatest ? turn.candidates[selectedCandidateIndex] : undefined

              return (
                <div key={index} className="space-y-4" data-testid="plan-turn-assistant">
                  {turn.candidates.length === 0 ? (
                    <div className="ac-card text-center text-wood-500">
                      条件に合うプランが見つかりませんでした。内容を変えてもう一度お試しください。
                    </div>
                  ) : (
                    <>
                      {isLatest && (
                        <div className="flex flex-wrap gap-2">
                          {turn.candidates.map((candidate, candidateIndex) => (
                            <button
                              key={`${candidate.label}-${candidateIndex}`}
                              type="button"
                              onClick={() => setSelectedCandidateIndex(candidateIndex)}
                              className={
                                candidateIndex === selectedCandidateIndex
                                  ? 'ac-btn-primary !px-4 !py-1.5 text-xs'
                                  : 'ac-btn-secondary !px-4 !py-1.5 text-xs'
                              }
                            >
                              {candidate.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {turn.candidates.map((candidate, candidateIndex) => (
                        <PlanCard key={`${candidate.label}-${candidateIndex}`} candidate={candidate} />
                      ))}

                      {isLatest && selectedCandidate && (
                        <MapView stops={selectedCandidate.stops} stores={stores} />
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="ac-card mb-6">
          <label htmlFor="plan-message" className="mb-2 block text-sm font-bold text-wood-700">
            今日やりたいことを教えてください
          </label>
          <textarea
            id="plan-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ランチして、映画見て、カフェ行きたい。2人、15時まで"
            rows={4}
            className="ac-input w-full resize-none"
            disabled={isSubmitting}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || message.trim().length === 0}
              className="ac-btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'プラン生成中...' : 'プランを生成する'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="ac-btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              条件をリセット
            </button>
            {isSubmitting && (
              <span className="flex items-center gap-2 text-sm font-bold text-wood-500">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-leaf-500 border-t-transparent"
                  aria-hidden="true"
                />
                プランを考えています（数秒かかります）...
              </span>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-2xl border-2 border-bubble-200 bg-bubble-50 px-4 py-2 text-sm font-bold text-bubble-700">
            {error}
          </p>
        )}
      </main>
    </>
  )
}
