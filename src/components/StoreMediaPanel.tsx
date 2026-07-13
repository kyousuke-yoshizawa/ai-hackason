import { ChangeEvent, DragEvent, useEffect, useState } from 'react'
import { Modal } from './Modal'
import { ApiError } from '../lib/api'
import { deleteStoreMedia, getStoreMedia, StoreMedia, uploadStoreMedia } from '../lib/storeMedia'

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
  const [media, setMedia] = useState<StoreMedia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMedia = async () => {
    setIsLoading(true)
    try {
      const res = await getStoreMedia(storeId)
      setMedia(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ファイル一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('画像（PNG/JPEG/WebP/GIF）またはPDFのみアップロードできます')
      return
    }

    setError(null)
    setIsUploading(true)
    try {
      await uploadStoreMedia(storeId, file)
      onNotify('ファイルをアップロードしました')
      await loadMedia()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'アップロードに失敗しました'
      setError(message)
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
        className={`mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
          isDraggingOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <p className="mb-2 text-sm text-gray-600">
          ファイルをドラッグ＆ドロップ、またはクリックして選択
        </p>
        <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {isUploading ? 'アップロード中...' : 'ファイルを選択'}
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleInputChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
        <p className="mt-2 text-xs text-gray-400">画像（PNG/JPEG/WebP/GIF）・PDF、10MBまで</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : media.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
          ファイルがまだありません
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {media.map((item) => (
            <li key={item.id} className="rounded-lg border border-gray-200 p-2">
              {item.media_type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.file_name}
                  className="mb-2 h-24 w-full rounded object-cover"
                />
              ) : (
                <div className="mb-2 flex h-24 w-full items-center justify-center rounded bg-gray-100 text-3xl">
                  📄
                </div>
              )}
              <p className="truncate text-xs text-gray-700" title={item.file_name}>
                {item.file_name}
              </p>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="mt-1 text-xs font-medium text-red-600 hover:underline"
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
