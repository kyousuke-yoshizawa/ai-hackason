import { api } from './api'

export interface StoreMedia {
  id: string
  store_id: string
  media_type: 'image' | 'document'
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  created_by: string
  created_at: string
  updated_at: string
  url: string
}

export function getStoreMedia(storeId: string) {
  return api.get<{ data: StoreMedia[] }>(`/api/stores/${storeId}/media`)
}

export function uploadStoreMedia(storeId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.upload<StoreMedia>(`/api/stores/${storeId}/media`, formData)
}

export function deleteStoreMedia(storeId: string, mediaId: string) {
  return api.delete<{ message: string }>(`/api/stores/${storeId}/media/${mediaId}`)
}
