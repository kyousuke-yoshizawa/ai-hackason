/**
 * @jest-environment node
 */
// T11: server/app.ts に追加したグローバル防御（404・エラーハンドラ・CORS制限）の検証

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
  fakeClient.seed('users', [{ id: 'admin-1', role: 'admin', is_active: true }])
})

describe('未知の /api/* パス (T11)', () => {
  it('存在しないエンドポイントへのGETは404かつJSON形式で返る（HTMLスタックトレースではない）', async () => {
    const res = await request(app).get('/api/does-not-exist')

    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toEqual({ error: 'not_found', message: expect.any(String) })
  })

  it('存在しないネストしたパスも404で返る', async () => {
    const res = await request(app).post('/api/stores/store-1/nonexistent-action')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })
})

describe('グローバルエラーハンドラ (T11)', () => {
  it('10MBを超えるファイルアップロードは413かつJSON形式で返る（HTMLスタックトレースではない）', async () => {
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024, 'a') // 11MB > 10MBの上限

    const res = await request(app)
      .post('/api/stores/store-1/media')
      .set('x-user-id', 'admin-1')
      .attach('file', oversizedBuffer, 'huge.png')

    expect(res.status).toBe(413)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toEqual({ error: 'file_too_large', message: expect.any(String) })
  })
})

// server/app.ts は CORS_ALLOWED_ORIGINS をモジュール読み込み時に一度だけ読むため、
// テスト内で動的に変更しても反映されない。未設定時の既定値
// （http://localhost:5173 のみ許可）を前提に検証する
describe('CORS許可オリジンの制限 (T11)', () => {
  it('許可されたオリジンには Access-Control-Allow-Origin が返る', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173')

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('許可されていないオリジンには Access-Control-Allow-Origin が返らない', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com')

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
