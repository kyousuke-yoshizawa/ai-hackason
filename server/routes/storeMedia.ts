import { Router } from 'express'
import multer from 'multer'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdminOrStoreManager, requireAuth } from '../middleware/auth.js'

export const storeMediaRouter = Router()

const STORAGE_BUCKET = 'store-media'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
})

const mediaTypeFromMime = (mimeType: string): 'image' | 'document' =>
  mimeType.startsWith('image/') ? 'image' : 'document'

const buildPublicUrl = (filePath: string) =>
  supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath).data.publicUrl

const storeExists = async (storeId: string) => {
  const { data } = await supabaseAdmin
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .is('deleted_at', null)
    .single()
  return !!data
}

storeMediaRouter.post(
  '/:storeId/media',
  requireAuth,
  requireAdminOrStoreManager('storeId'),
  upload.single('file'),
  async (req, res) => {
    const { storeId } = req.params

    if (!(await storeExists(storeId))) {
      return res.status(404).json({ error: '店舗が見つかりません' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'file は必須です' })
    }

    const filePath = `${storeId}/${Date.now()}-${req.file.originalname}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype })

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message })
    }

    const { data, error } = await supabaseAdmin
      .from('store_media')
      .insert({
        store_id: storeId,
        media_type: mediaTypeFromMime(req.file.mimetype),
        file_path: filePath,
        file_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        created_by: req.authedUser!.id,
      })
      .select()
      .single()

    if (error) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([filePath])
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({ ...data, url: buildPublicUrl(data.file_path) })
  }
)

storeMediaRouter.get('/:storeId/media', async (req, res) => {
  const { storeId } = req.params

  if (!(await storeExists(storeId))) {
    return res.status(404).json({ error: '店舗が見つかりません' })
  }

  const { data, error } = await supabaseAdmin
    .from('store_media')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ data: (data ?? []).map((m) => ({ ...m, url: buildPublicUrl(m.file_path) })) })
})

storeMediaRouter.delete(
  '/:storeId/media/:mediaId',
  requireAuth,
  requireAdminOrStoreManager('storeId'),
  async (req, res) => {
    const { storeId, mediaId } = req.params

    const { data: media, error: fetchError } = await supabaseAdmin
      .from('store_media')
      .select('*')
      .eq('id', mediaId)
      .eq('store_id', storeId)
      .single()

    if (fetchError || !media) {
      return res.status(404).json({ error: 'ファイルが見つかりません' })
    }

    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([media.file_path])

    const { error: deleteError } = await supabaseAdmin
      .from('store_media')
      .delete()
      .eq('id', mediaId)

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message })
    }

    res.json({ message: 'ファイルを削除しました' })
  }
)
