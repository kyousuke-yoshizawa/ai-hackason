import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generatePlan, summarizePlanForHistory } from '../lib/plan'
import { api } from '../lib/api'
import { PLAN_TEMPLATES, REGENERATE_SUFFIX } from '../lib/planTemplates'
import { useStagedLoadingMessage } from '../hooks/useStagedLoadingMessage'
import { IntentSummary } from '../components/IntentSummary'
import { ToastContainer, useToast } from '../components/Toast'
import type { PlanCandidate, PlanIntent } from '../types/plan'
import type { AdminStore } from '../components/StoreForm'
import PlanCard from '../components/PlanCard'
import ReservationModal from '../components/ReservationModal'
import MapView, { type Landmark } from '../components/MapView'
import Cloud from '../components/decor/Cloud'
import GrassBorder from '../components/decor/GrassBorder'

type Turn =
  | { role: 'user'; message: string }
  | { role: 'assistant'; candidates: PlanCandidate[]; intent: PlanIntent }

interface ReservingStop {
  storeId: string
  storeName: string
  time: string
  partySize: number
}

interface PinnedPlan {
  id: string
  candidate: PlanCandidate
  sourceMessage: string
}

const TURNS_STORAGE_KEY = 'plan:turns'
const PINNED_STORAGE_KEY = 'plan:pinned'
const MAX_PINNED = 3

// Issue #141: セッション内のみの結果保持（要件7章プライバシー方針に合わせ localStorage は使わない）
function loadFromSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function bestScoreIndex(candidates: PlanCandidate[]): number {
  let bestIndex = 0
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].score > candidates[bestIndex].score) bestIndex = i
  }
  return bestIndex
}

export default function PlanPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>(() => loadFromSession(TURNS_STORAGE_KEY, []))
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0)
  const [stores, setStores] = useState<AdminStore[]>([])
  const [landmarks, setLandmarks] = useState<Landmark[]>([])
  const [reservingStop, setReservingStop] = useState<ReservingStop | null>(null)
  const [pinnedPlans, setPinnedPlans] = useState<PinnedPlan[]>(() => loadFromSession(PINNED_STORAGE_KEY, []))
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState('')
  const { toast, showToast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resultHeadingRef = useRef<HTMLHeadingElement>(null)

  const stagedLoadingMessage = useStagedLoadingMessage(isSubmitting)

  useEffect(() => {
    api
      .get<{ data: AdminStore[] }>('/api/stores')
      .then((res) => setStores(res.data))
      .catch(() => {
        // マップ用の座標補完に使うだけなので、取得失敗してもプラン生成自体は継続する
      })
  }, [])

  useEffect(() => {
    api
      .get<{ area_name: string; landmarks: Landmark[] }>('/api/area')
      .then((res) => setLandmarks(res.landmarks))
      .catch(() => {
        // マップ背景装飾用のみなので、取得失敗してもプラン生成自体は継続する
      })
  }, [])

  useEffect(() => {
    sessionStorage.setItem(TURNS_STORAGE_KEY, JSON.stringify(turns))
  }, [turns])

  useEffect(() => {
    sessionStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedPlans))
  }, [pinnedPlans])

  const submit = async (text: string) => {
    const trimmed = text.trim()
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
    setLastSubmittedMessage(trimmed)
    setTurns((prev) => [...prev, { role: 'user', message: trimmed }])

    const result = await generatePlan({ message: trimmed, history })

    if (result.success && result.plan) {
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', candidates: result.plan!.candidates, intent: result.plan!.intent },
      ])
      setSelectedCandidateIndex(0)
    } else {
      setError(result.message ?? 'プラン生成に失敗しました')
    }

    setIsSubmitting(false)
  }

  const handleSubmit = async () => {
    await submit(message)
    setMessage('')
  }

  const handleRegenerate = async () => {
    if (!lastSubmittedMessage) return
    await submit(`${lastSubmittedMessage}${REGENERATE_SUFFIX}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTemplateClick = (text: string) => {
    setMessage(text)
    textareaRef.current?.focus()
  }

  const handleReset = () => {
    setTurns([])
    setSelectedCandidateIndex(0)
    setError(null)
  }

  const handleRequestEdit = () => {
    textareaRef.current?.focus()
  }

  const togglePin = (candidate: PlanCandidate, sourceMessage: string) => {
    const id = `${candidate.label}::${sourceMessage}`
    setPinnedPlans((prev) => {
      if (prev.some((p) => p.id === id)) {
        return prev.filter((p) => p.id !== id)
      }
      if (prev.length >= MAX_PINNED) {
        showToast(`ピン留めは${MAX_PINNED}件までです`, 'error')
        return prev
      }
      return [...prev, { id, candidate, sourceMessage }]
    })
  }

  const handleCopyResult = (success: boolean) => {
    showToast(success ? 'コピーしました' : 'コピーに失敗しました', success ? 'success' : 'error')
  }

  const lastAssistantTurnIndex = turns.reduce(
    (acc, turn, index) => (turn.role === 'assistant' ? index : acc),
    -1
  )

  // 生成完了時、結果見出しへスクロール＋フォーカス移動（aria-live読み上げの補完）
  useEffect(() => {
    if (!isSubmitting && lastAssistantTurnIndex >= 0) {
      resultHeadingRef.current?.scrollIntoView({ behavior: 'smooth' })
      resultHeadingRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- turns更新（生成完了）のたびに1回だけ発火させたい
  }, [lastAssistantTurnIndex])

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
        {pinnedPlans.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-wood-600">📌 ピン留め中のプラン</h2>
              <button
                type="button"
                onClick={() => setPinnedPlans([])}
                className="text-xs font-bold text-wood-400 underline hover:text-wood-600"
              >
                すべて解除
              </button>
            </div>
            <div className="space-y-4">
              {pinnedPlans.map((pinned) => (
                <div key={pinned.id}>
                  <p className="mb-1 text-xs text-wood-400">「{pinned.sourceMessage}」の案</p>
                  <PlanCard
                    candidate={pinned.candidate}
                    stores={stores}
                    onReserve={(params) => setReservingStop(params)}
                    isPinned
                    onTogglePin={() => togglePin(pinned.candidate, pinned.sourceMessage)}
                    onCopyResult={handleCopyResult}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div aria-live="polite">
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
                const bestIndex = turn.candidates.length > 0 ? bestScoreIndex(turn.candidates) : -1
                const sourceMessage = turns
                  .slice(0, index)
                  .reverse()
                  .find((t): t is Extract<Turn, { role: 'user' }> => t.role === 'user')?.message ?? ''

                return (
                  <div key={index} className="space-y-4" data-testid="plan-turn-assistant">
                    {isLatest && (
                      <h2
                        ref={resultHeadingRef}
                        tabIndex={-1}
                        className="text-sm font-bold text-wood-600 outline-none"
                      >
                        AIからの提案
                      </h2>
                    )}

                    {turn.candidates.length === 0 ? (
                      <div className="ac-card text-center text-wood-500">
                        条件に合うプランが見つかりませんでした。内容を変えてもう一度お試しください。
                      </div>
                    ) : (
                      <>
                        <IntentSummary intent={turn.intent} onRequestEdit={isLatest ? handleRequestEdit : undefined} />

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
                          <PlanCard
                            key={`${candidate.label}-${candidateIndex}`}
                            candidate={candidate}
                            stores={stores}
                            partySize={turn.intent.party_size}
                            budget={turn.intent.budget}
                            onReserve={(params) => setReservingStop(params)}
                            isBest={candidateIndex === bestIndex}
                            isPinned={pinnedPlans.some((p) => p.id === `${candidate.label}::${sourceMessage}`)}
                            onTogglePin={() => togglePin(candidate, sourceMessage)}
                            onCopyResult={handleCopyResult}
                          />
                        ))}

                        {isLatest && selectedCandidate && (
                          <MapView stops={selectedCandidate.stops} stores={stores} landmarks={landmarks} />
                        )}

                        {isLatest && (
                          <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={isSubmitting}
                            className="ac-btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            🔄 別の案を見る
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="ac-card mb-6">
          <label htmlFor="plan-message" className="mb-2 block text-sm font-bold text-wood-700">
            今日やりたいことを教えてください
          </label>

          <div className="mb-3 flex flex-wrap gap-2">
            {PLAN_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => handleTemplateClick(template.text)}
                className="ac-btn-ghost !px-3 !py-1.5 text-xs"
              >
                {template.label}
              </button>
            ))}
          </div>

          <textarea
            id="plan-message"
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ランチして、映画見て、カフェ行きたい。2人、15時まで（Ctrl+Enterで送信）"
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
                {stagedLoadingMessage}
              </span>
            )}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-2xl border-2 border-bubble-200 bg-bubble-50 px-4 py-2 text-sm font-bold text-bubble-700"
          >
            {error}
          </p>
        )}
      </main>

      {reservingStop &&
        (() => {
          // #122: 予約モーダルの時刻スロット生成に使う営業時間は、店舗マスタ（stores）から補完する
          const matchedStore = stores.find((s) => s.id === reservingStop.storeId)
          return (
            <ReservationModal
              isOpen
              onClose={() => setReservingStop(null)}
              storeId={reservingStop.storeId}
              storeName={reservingStop.storeName}
              openTime={matchedStore?.open_time}
              closeTime={matchedStore?.close_time}
              initialTime={reservingStop.time}
              initialPartySize={reservingStop.partySize}
              onViewReservations={() => navigate('/reservations')}
            />
          )
        })()}

      <ToastContainer toast={toast} />
    </>
  )
}
