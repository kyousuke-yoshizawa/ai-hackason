import { supabaseAdmin } from '../../db.js'

// server/routes/storeMedia.ts と同じバケット名（同ファイルではexportされていないため値を揃えて再定義）
const STORAGE_BUCKET = 'store-media'

interface StoreMediaThumbnailRow {
  store_id: string
  file_path: string
  created_at: string
}

const buildPublicUrl = (filePath: string): string =>
  supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath).data.publicUrl

/**
 * 指定した店舗ID群について、店舗ごとに最初に登録された（created_atが最古の）
 * store_mediaをサムネイルとして採用し、公開URLを店舗IDで引けるMapとして返す。
 *
 * Issue #132: 店舗一覧・プランカードでの写真表示のために、GET /api/stores の
 * enrichStoresWithAggregates から呼び出される。この一覧APIの成否・レイテンシに
 * サムネイル取得の失敗が影響しないよう、Supabaseクエリが失敗した場合や例外が
 * 発生した場合は例外を投げず、console.warn でログした上で空のMapを返す。
 */
export async function getThumbnailUrlsForStores(storeIds: string[]): Promise<Map<string, string>> {
  const uniqueStoreIds = [...new Set(storeIds)]
  if (uniqueStoreIds.length === 0) {
    return new Map()
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('store_media')
      .select('store_id, file_path, created_at')
      .in('store_id', uniqueStoreIds)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('getThumbnailUrlsForStores: store_media の取得に失敗しました', error.message)
      return new Map()
    }

    const thumbnailUrlsByStoreId = new Map<string, string>()
    for (const row of (data ?? []) as StoreMediaThumbnailRow[]) {
      if (!thumbnailUrlsByStoreId.has(row.store_id)) {
        thumbnailUrlsByStoreId.set(row.store_id, buildPublicUrl(row.file_path))
      }
    }

    return thumbnailUrlsByStoreId
  } catch (err) {
    console.warn('getThumbnailUrlsForStores: 予期しないエラーが発生しました', err)
    return new Map()
  }
}
