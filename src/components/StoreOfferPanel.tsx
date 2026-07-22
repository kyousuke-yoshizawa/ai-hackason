import { FormEvent, useEffect, useState } from 'react'
import { z } from 'zod'
import { createOffer, deleteOffer, getOffers, isOfferActiveNow, updateOffer } from '../lib/offers'
import type { Offer } from '../lib/offers'
import { generatePlan } from '../lib/plan'
import type { PlanCandidate } from '../types/plan'

interface StoreOfferPanelProps {
  storeId: string
  storeName?: string
  storeCategory?: string
  onNotify?: (message: string, type?: 'success' | 'error') => void
}

interface OfferFormValues {
  description: string
  start_time: string
  end_time: string
  weekdays_only: boolean
  is_active: boolean
}

const EMPTY_FORM: OfferFormValues = {
  description: '',
  start_time: '',
  end_time: '',
  weekdays_only: false,
  is_active: true,
}

const offerSchema = z
  .object({
    description: z.string().min(1, '説明は必須です'),
    start_time: z.string().min(1, '開始時刻は必須です'),
    end_time: z.string().min(1, '終了時刻は必須です'),
    weekdays_only: z.boolean(),
    is_active: z.boolean(),
  })
  .refine((v) => v.start_time < v.end_time, {
    message: '開始時刻は終了時刻より前である必要があります',
    path: ['end_time'],
  })

function toFormValues(offer: Offer): OfferFormValues {
  return {
    description: offer.description,
    start_time: offer.start_time,
    end_time: offer.end_time,
    weekdays_only: offer.weekdays_only,
    is_active: offer.is_active,
  }
}

export function StoreOfferPanel({ storeId, storeName, storeCategory, onNotify }: StoreOfferPanelProps) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewCandidates, setPreviewCandidates] = useState<PlanCandidate[] | null>(null)

  const [newOffer, setNewOffer] = useState<OfferFormValues>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<OfferFormValues>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const loadOffers = async () => {
    setIsLoading(true)
    setLoadError(null)
    const result = await getOffers(storeId)
    if (!result.success) {
      setLoadError(result.message ?? 'オファーの取得に失敗しました')
      setIsLoading(false)
      return
    }
    setOffers(result.offers)
    setIsLoading(false)
  }

  useEffect(() => {
    loadOffers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const parseForm = (values: OfferFormValues): Record<string, string> | null => {
    const parsed = offerSchema.safeParse(values)
    if (parsed.success) return null
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message
    }
    return fieldErrors
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const fieldErrors = parseForm(newOffer)
    if (fieldErrors) {
      setCreateErrors(fieldErrors)
      return
    }

    setCreateErrors({})
    setIsCreating(true)
    const result = await createOffer({ store_id: storeId, ...newOffer })
    setIsCreating(false)

    if (result.success) {
      onNotify?.('オファーを追加しました')
      setNewOffer(EMPTY_FORM)
      await loadOffers()
    } else {
      onNotify?.(result.message ?? 'オファーの追加に失敗しました', 'error')
    }
  }

  const startEdit = (offer: Offer) => {
    setEditingId(offer.id)
    setEditValues(toFormValues(offer))
    setEditErrors({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditErrors({})
  }

  const handleSaveEdit = async (id: string) => {
    const fieldErrors = parseForm(editValues)
    if (fieldErrors) {
      setEditErrors(fieldErrors)
      return
    }

    setEditErrors({})
    setIsSavingEdit(true)
    const result = await updateOffer(id, editValues)
    setIsSavingEdit(false)

    if (result.success) {
      onNotify?.('オファーを更新しました')
      setEditingId(null)
      await loadOffers()
    } else {
      onNotify?.(result.message ?? 'オファーの更新に失敗しました', 'error')
    }
  }

  const handleDelete = async (offer: Offer) => {
    if (!confirm(`「${offer.description}」を削除しますか？`)) return
    const result = await deleteOffer(offer.id)
    if (result.success) {
      onNotify?.('オファーを削除しました')
      await loadOffers()
    } else {
      onNotify?.(result.message ?? 'オファーの削除に失敗しました', 'error')
    }
  }

  // Issue #135: オファーが実際にAIプランへ反映されるかを、店舗管理者がその場で
  // 試せるようにするプレビュー機能。店舗名/カテゴリを含む固定文言で1回だけプラン生成を
  // 呼び出し、返ってきた候補に自店舗が含まれるかを表示する。
  // PLAN_MOCK=1環境（ANTHROPIC_API_KEY未設定時のモックモード）では、実際のオファー内容に
  // かかわらず固定のモック応答が返るため、このプレビューでもオファーの反映は確認できない。
  const handlePreview = async () => {
    setIsPreviewing(true)
    setPreviewError(null)
    setPreviewCandidates(null)

    const subject = storeCategory ?? storeName ?? 'このお店'
    const message = `${subject}のカテゴリで、お得に行きたい`

    const result = await generatePlan({ message })
    setIsPreviewing(false)

    if (!result.success || !result.plan) {
      setPreviewError(result.message ?? 'プラン生成に失敗しました')
      return
    }
    setPreviewCandidates(result.plan.candidates)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleCreate} className="space-y-3 rounded-2xl border-2 border-wood-200 bg-sand-50 p-4">
        <p className="text-sm font-bold text-wood-700">オファーを追加</p>
        <div>
          <label className="ac-label">説明</label>
          <input
            type="text"
            value={newOffer.description}
            onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
            className="ac-input"
            placeholder="例: ドリンク1杯無料"
          />
          {createErrors.description && (
            <p className="mt-1 text-xs font-bold text-bubble-600">{createErrors.description}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ac-label">開始時刻</label>
            <input
              type="time"
              value={newOffer.start_time}
              onChange={(e) => setNewOffer({ ...newOffer, start_time: e.target.value })}
              className="ac-input"
            />
            {createErrors.start_time && (
              <p className="mt-1 text-xs font-bold text-bubble-600">{createErrors.start_time}</p>
            )}
          </div>
          <div>
            <label className="ac-label">終了時刻</label>
            <input
              type="time"
              value={newOffer.end_time}
              onChange={(e) => setNewOffer({ ...newOffer, end_time: e.target.value })}
              className="ac-input"
            />
            {createErrors.end_time && <p className="mt-1 text-xs font-bold text-bubble-600">{createErrors.end_time}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm text-wood-700">
            <input
              type="checkbox"
              checked={newOffer.weekdays_only}
              onChange={(e) => setNewOffer({ ...newOffer, weekdays_only: e.target.checked })}
              className="h-4 w-4 rounded border-2 border-sand-300 text-leaf-500 focus:ring-2 focus:ring-leaf-300"
            />
            平日限定
          </label>
          <label className="flex items-center gap-1.5 text-sm text-wood-700">
            <input
              type="checkbox"
              checked={newOffer.is_active}
              onChange={(e) => setNewOffer({ ...newOffer, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-2 border-sand-300 text-leaf-500 focus:ring-2 focus:ring-leaf-300"
            />
            有効
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={isCreating} className="ac-btn-primary !px-4 !py-2 text-sm">
            {isCreating ? '追加中...' : '追加する'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm font-bold text-wood-500">読み込み中...</p>
      ) : loadError ? (
        <p className="text-sm font-bold text-bubble-600">{loadError}</p>
      ) : offers.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-wood-200 bg-sand-50/60 px-4 py-6 text-center text-sm text-wood-400">
          オファーがまだありません
        </p>
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-2xl border-2 border-wood-200 bg-white p-3">
              {editingId === offer.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="ac-label">説明</label>
                    <input
                      type="text"
                      value={editValues.description}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      className="ac-input"
                    />
                    {editErrors.description && (
                      <p className="mt-1 text-xs font-bold text-bubble-600">{editErrors.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="ac-label">開始時刻</label>
                      <input
                        type="time"
                        value={editValues.start_time}
                        onChange={(e) => setEditValues({ ...editValues, start_time: e.target.value })}
                        className="ac-input"
                      />
                      {editErrors.start_time && (
                        <p className="mt-1 text-xs font-bold text-bubble-600">{editErrors.start_time}</p>
                      )}
                    </div>
                    <div>
                      <label className="ac-label">終了時刻</label>
                      <input
                        type="time"
                        value={editValues.end_time}
                        onChange={(e) => setEditValues({ ...editValues, end_time: e.target.value })}
                        className="ac-input"
                      />
                      {editErrors.end_time && (
                        <p className="mt-1 text-xs font-bold text-bubble-600">{editErrors.end_time}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-1.5 text-sm text-wood-700">
                      <input
                        type="checkbox"
                        checked={editValues.weekdays_only}
                        onChange={(e) => setEditValues({ ...editValues, weekdays_only: e.target.checked })}
                        className="h-4 w-4 rounded border-2 border-sand-300 text-leaf-500 focus:ring-2 focus:ring-leaf-300"
                      />
                      平日限定
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-wood-700">
                      <input
                        type="checkbox"
                        checked={editValues.is_active}
                        onChange={(e) => setEditValues({ ...editValues, is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-2 border-sand-300 text-leaf-500 focus:ring-2 focus:ring-leaf-300"
                      />
                      有効
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={cancelEdit} className="ac-btn-secondary !px-3 !py-1.5 text-xs">
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(offer.id)}
                      disabled={isSavingEdit}
                      className="ac-btn-primary !px-3 !py-1.5 text-xs"
                    >
                      {isSavingEdit ? '保存中...' : '保存する'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-wood-800">{offer.description}</p>
                    <p className="text-xs text-wood-500">
                      {offer.start_time} - {offer.end_time}
                      {offer.weekdays_only ? '（平日限定）' : ''}
                    </p>
                    <p className="mt-1 text-xs font-bold">
                      {isOfferActiveNow(offer) ? (
                        <span className="text-leaf-600">🟢 いまプラン生成で加点中（+15%）</span>
                      ) : !offer.is_active ? (
                        <span className="text-wood-400">⏸ 無効のため加点対象外</span>
                      ) : (
                        <span className="text-wood-400">
                          ⏸ {offer.weekdays_only ? '平日の' : ''}
                          {offer.start_time}〜{offer.end_time} に加点
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={`ac-badge ${offer.is_active ? 'bg-leaf-100 text-leaf-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {offer.is_active ? '有効' : '無効'}
                    </span>
                    <button type="button" onClick={() => startEdit(offer)} className="font-bold text-leaf-600 hover:underline">
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(offer)}
                      className="font-bold text-bubble-600 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/60 p-4 space-y-3">
        <p className="text-xs text-wood-500">
          オファーが有効な時間帯は、AIプランのスコアが+15%加点され、プラン文面にオファー内容が紹介されます。
        </p>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewing}
          className="ac-btn-secondary !px-4 !py-2 text-sm"
        >
          {isPreviewing ? '確認中...' : 'プランでの見え方を試す'}
        </button>

        {previewError && <p className="text-sm font-bold text-bubble-600">{previewError}</p>}

        {previewCandidates && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-wood-700">プラン候補への反映結果</p>
            {previewCandidates.map((candidate, index) => {
              const ownStop = candidate.stops.find((stop) => stop.store_id === storeId)
              return (
                <div key={`${candidate.label}-${index}`} className="rounded-xl border-2 border-wood-200 bg-white p-3 text-sm">
                  <p className="font-bold text-wood-800">{candidate.label}</p>
                  {ownStop ? (
                    <>
                      <p className="mt-1 text-leaf-700">
                        ✅ この店舗が案に含まれています（{ownStop.start_time}〜{ownStop.end_time}）
                      </p>
                      {ownStop.reason && <p className="mt-1 text-xs text-wood-500">理由: {ownStop.reason}</p>}
                      {ownStop.offer_note && (
                        <p className="mt-1 text-xs text-bubble-600">オファー言及: {ownStop.offer_note}</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-wood-400">この案には含まれていません</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
