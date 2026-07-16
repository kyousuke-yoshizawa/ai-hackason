import { ChangeEvent, DragEvent, useState } from 'react'
import { Modal } from './Modal'
import { ApiError } from '../lib/api'
import { deleteStoreMedia, getStoreMedia, StoreMedia, uploadStoreMedia } from '../lib/storeMedia'
import { useApiQuery } from '../hooks/useApiQuery'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']

export function StoreMediaPanel({
  storeId,
  storeName,
  onClose,
  onNotify,
}: {
  storeId: string
  storeName: string
  onClose: () => void
  onNotify: (message: string, type?: 'success' | 'error') => void
}) {
  const {
    data: media,
    isLoading,
    error: loadError,
    reload: loadMedia,
  } = useApiQuery(async () => (await getStoreMedia(storeId)).data, [storeId])
  const [isUploading, setIsUploading] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)
  const error = operationError ?? loadError

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setOperationError('画像（PNG/JPEG/WebP/GIF）またはPDFのみアップロードできます')
      return
    }

    setOperationError(null)
    setIsUploading(true)
    try {
      await uploadStoreMedia(storeId, file)
      onNotify('ファイルをアップロードしました')
      await loadMedia()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'アップロードに失敗しました'
      setOperationError(message)
      onNotify(message, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDelete = async (item: StoreMedia) => {
    if (!confirm(`${item.file_name} を削除しますか？`)) return
    try {
      await deleteStoreMedia(storeId, item.id)
      onNotify('ファイルを削除しました')
      await loadMedia()
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '削除に失敗しました', 'error')
    }
  }

  return (
    <Modal title={`メディア管理：${storeName}`} onClose={onClose} maxWidth="max-w-lg">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`mb-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          isDraggingOver ? 'border-leaf-400 bg-leaf-50' : 'border-wood-200 bg-sand-100/60'
        }`}
      >
        <p className="mb-2 text-sm font-bold text-wood-600">
          ファイルをドラッグ＆ドロップ、またはクリックして選択
        </p>
        <label className="ac-btn-primary cursor-pointer">
          {isUploading ? 'アップロード中...' : 'ファイルを選択'}
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleInputChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
        <p className="mt-2 text-xs text-wood-400">画像（PNG/JPEG/WebP/GIF）・PDF、10MBまで</p>
      </div>

      {error && (
        <p className="mb-4 rounded-2xl border-2 border-bubble-200 bg-bubble-50 px-3 py-2 text-sm font-bold text-bubble-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm font-bold text-wood-500">読み込み中...</p>
      ) : !media || media.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-wood-200 bg-sand-50/60 px-4 py-6 text-center text-sm text-wood-400">
          ファイルがまだありません
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {media.map((item) => (
            <li key={item.id} className="rounded-2xl border-2 border-wood-200 bg-sand-50 p-2">
              {item.media_type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.file_name}
                  className="mb-2 h-24 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mb-2 flex h-24 w-full items-center justify-center rounded-xl bg-sand-100 text-3xl">
                  📄
                </div>
              )}
              <p className="truncate text-xs font-bold text-wood-700" title={item.file_name}>
                {item.file_name}
              </p>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="mt-1 text-xs font-bold text-bubble-600 hover:underline"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
