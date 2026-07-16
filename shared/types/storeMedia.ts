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
