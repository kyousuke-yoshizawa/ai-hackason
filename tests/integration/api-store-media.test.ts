/**
 * @jest-environment node
 */
// API Integration Tests for Store Media Attachment (Issue #35)
// supertest（内部でformidable/cuid2を使用）はjsdom環境のTextEncoder欠如と衝突するためnode環境を指定

// server/routes/*.ts と server/middleware/auth.ts（backend/auth/authz.ts 経由）は
// いずれも backend/db.ts の同一 supabaseAdmin を使うため、モックは1つで足りる
jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import request from 'supertest'
import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { app } from '../../server/app'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

beforeEach(() => {
  fakeClient.reset()
  fakeClient.seed('stores', [{ id: 'store-1', name: 'テスト店舗', deleted_at: null }])
  fakeClient.seed('users', [
    { id: 'admin-1', role: 'admin', is_active: true },
    { id: 'manager-1', role: 'store_manager', is_active: true },
    { id: 'manager-2', role: 'store_manager', is_active: true },
    { id: 'user-1', role: 'user', is_active: true },
  ])
  fakeClient.seed('store_managers', [{ store_id: 'store-1', manager_id: 'manager-1' }])
})

// TC_301_1: ファイルアップロード成功（admin 権限）
describe('POST /api/stores/:storeId/media (TC_301_1)', () => {
  it('uploads a file as admin', async () => {
    const res = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'admin-1')
      .attach('file', Buffer.from('fake-image-bytes'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })

    expect(res.status).toBe(201)
    expect(res.body.store_id).toBe('store-1')
    expect(res.body.media_type).toBe('image')
    expect(res.body.file_name).toBe('photo.png')
    expect(res.body.url).toContain('store-media')
  })

  it('uploads a file as the store\'s own store_manager', async () => {
    const res = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'manager-1')
      .attach('file', Buffer.from('fake-doc-bytes'), {
        filename: 'menu.pdf',
        contentType: 'application/pdf',
      })

    expect(res.status).toBe(201)
    expect(res.body.media_type).toBe('document')
  })

  it('returns 401 when x-user-id header is missing', async () => {
    const res = await request(app)
      .post('/api/stores/store-1/media')
      .attach('file', Buffer.from('bytes'), 'photo.png')

    expect(res.status).toBe(401)
  })

  // T04: is_active=false のユーザは admin ロールでも拒否される
  it('returns 401 for a deactivated admin (is_active=false)', async () => {
    fakeClient.seed('users', [{ id: 'inactive-admin', role: 'admin', is_active: false }])

    const res = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'inactive-admin')
      .attach('file', Buffer.from('bytes'), 'photo.png')

    expect(res.status).toBe(401)
  })

  // TC_301_2: 権限なしユーザの削除試行→403 Forbidden（アップロードも同様に検証）
  it('returns 403 for a store_manager of a different store', async () => {
    const res = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'manager-2')
      .attach('file', Buffer.from('bytes'), 'photo.png')

    expect(res.status).toBe(403)
  })

  it('returns 403 for a regular user', async () => {
    const res = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'user-1')
      .attach('file', Buffer.from('bytes'), 'photo.png')

    expect(res.status).toBe(403)
  })

  // TC_301_3: 存在しない store_id へのアップロード→404 Not Found
  it('returns 404 for a non-existent store', async () => {
    const res = await request(app)
      .post('/api/stores/store-999/media')
      .set('x-user-id', 'admin-1')
      .attach('file', Buffer.from('bytes'), 'photo.png')

    expect(res.status).toBe(404)
  })

  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/stores/store-1/media').set('x-user-id', 'admin-1')

    expect(res.status).toBe(400)
  })
})

// TC_301_4: 同一店舗内の複数ファイル管理
describe('GET /api/stores/:storeId/media (TC_301_4)', () => {
  it('lists uploaded media for a store', async () => {
    await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'admin-1')
      .attach('file', Buffer.from('a'), 'a.png')
    await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'admin-1')
      .attach('file', Buffer.from('b'), 'b.pdf')

    const res = await request(app).get('/api/stores/store-1/media')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].url).toBeDefined()
  })

  it('returns 404 for a non-existent store', async () => {
    const res = await request(app).get('/api/stores/store-999/media')
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/stores/:storeId/media/:mediaId', () => {
  it('deletes media as admin', async () => {
    const uploadRes = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'admin-1')
      .attach('file', Buffer.from('a'), 'a.png')

    const res = await request(app)
      .delete(`/api/stores/store-1/media/${uploadRes.body.id}`)
      .set('x-user-id', 'admin-1')

    expect(res.status).toBe(200)
    expect(fakeClient.getRows('store_media')).toHaveLength(0)
  })

  it('returns 403 for a regular user', async () => {
    const uploadRes = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'admin-1')
      .attach('file', Buffer.from('a'), 'a.png')

    const res = await request(app)
      .delete(`/api/stores/store-1/media/${uploadRes.body.id}`)
      .set('x-user-id', 'user-1')

    expect(res.status).toBe(403)
  })

  it('returns 404 for a non-existent media id', async () => {
    const res = await request(app)
      .delete('/api/stores/store-1/media/does-not-exist')
      .set('x-user-id', 'admin-1')

    expect(res.status).toBe(404)
  })
})
