import { api } from './api'
import type { StoreMedia } from '../../shared/types/storeMedia'

export type { StoreMedia }

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
