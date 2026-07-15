/**
 * @jest-environment node
 */
// T08: フロントのデータアクセス一本化に伴い新設した likes/reviews/permissions の
// バックエンドAPIを、実Express appに対してsupertestで検証する。

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
  fakeClient.setUniqueConstraint('likes', ['user_id', 'store_id'])
  fakeClient.seed('stores', [{ id: 'store-1', name: 'テスト店舗', category: 'カフェ', deleted_at: null }])
  fakeClient.seed('users', [
    { id: 'user-1', name: 'ユーザー1', role: 'user', is_active: true },
    { id: 'user-2', name: 'ユーザー2', role: 'user', is_active: true },
    { id: 'admin-1', role: 'admin', is_active: true },
  ])
})

describe('POST/DELETE /api/likes', () => {
  it('creates a like for the authenticated user', async () => {
    const res = await request(app).post('/api/likes').set('x-user-id', 'user-1').send({ store_id: 'store-1' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ user_id: 'user-1', store_id: 'store-1' })
  })

  it('rejects a duplicate like with 409', async () => {
    await request(app).post('/api/likes').set('x-user-id', 'user-1').send({ store_id: 'store-1' })
    const res = await request(app).post('/api/likes').set('x-user-id', 'user-1').send({ store_id: 'store-1' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('already_liked')
  })

  it('removes a like by store', async () => {
    await request(app).post('/api/likes').set('x-user-id', 'user-1').send({ store_id: 'store-1' })
    const res = await request(app).delete('/api/likes/store-1').set('x-user-id', 'user-1')

    expect(res.status).toBe(200)
    expect(fakeClient.getRows('likes')).toHaveLength(0)
  })
})

describe('GET /api/likes/user/:userId', () => {
  it('returns the requesting user\'s own likes with store info', async () => {
    await request(app).post('/api/likes').set('x-user-id', 'user-1').send({ store_id: 'store-1' })

    const res = await request(app).get('/api/likes/user/user-1').set('x-user-id', 'user-1')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].stores).toMatchObject({ id: 'store-1', name: 'テスト店舗' })
  })

  it('rejects fetching another user\'s likes when not admin', async () => {
    const res = await request(app).get('/api/likes/user/user-1').set('x-user-id', 'user-2')

    expect(res.status).toBe(403)
  })

  it('allows an admin to fetch any user\'s likes', async () => {
    const res = await request(app).get('/api/likes/user/user-1').set('x-user-id', 'admin-1')

    expect(res.status).toBe(200)
  })
})

describe('GET /api/stores/:storeId/likes/count と /mine', () => {
  it('returns the like count for a store (no auth required)', async () => {
    await request(app).post('/api/likes').set('x-user-id', 'user-1').send({ store_id: 'store-1' })
    await request(app).post('/api/likes').set('x-user-id', 'user-2').send({ store_id: 'store-1' })

    const res = await request(app).get('/api/stores/store-1/likes/count')

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(2)
  })

  it('reports whether the authenticated user has liked the store', async () => {
    await request(app).post('/api/likes').set('x-user-id', 'user-1').send({ store_id: 'store-1' })

    const res = await request(app).get('/api/stores/store-1/likes/mine').set('x-user-id', 'user-1')

    expect(res.status).toBe(200)
    expect(res.body.liked).toBe(true)
  })
})

describe('POST/PUT/DELETE /api/reviews', () => {
  it('creates a review with valid rating and comment', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 5, comment: 'とても良かったです' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ rating: 5, comment: 'とても良かったです' })
  })

  it('rejects a rating outside 1-5 with validation_error', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 6, comment: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('rejects a comment exceeding the 500-character limit', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 3, comment: 'a'.repeat(501) })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('updates the review owned by the requesting user', async () => {
    const created = await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 3, comment: '普通' })

    const res = await request(app)
      .put(`/api/reviews/${created.body.id}`)
      .set('x-user-id', 'user-1')
      .send({ rating: 5, comment: '最高でした' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ rating: 5, comment: '最高でした' })
  })

  it('returns 404 when updating a review owned by another user', async () => {
    const created = await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 3, comment: '普通' })

    const res = await request(app)
      .put(`/api/reviews/${created.body.id}`)
      .set('x-user-id', 'user-2')
      .send({ rating: 1, comment: '横取り' })

    expect(res.status).toBe(404)
  })

  it('deletes the review owned by the requesting user', async () => {
    const created = await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 3, comment: '普通' })

    const res = await request(app).delete(`/api/reviews/${created.body.id}`).set('x-user-id', 'user-1')

    expect(res.status).toBe(200)
    expect(fakeClient.getRows('reviews')).toHaveLength(0)
  })

  it('returns 404 when deleting a review owned by another user, and leaves it intact', async () => {
    const created = await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 3, comment: '普通' })

    const res = await request(app).delete(`/api/reviews/${created.body.id}`).set('x-user-id', 'user-2')

    expect(res.status).toBe(404)
    expect(fakeClient.getRows('reviews')).toHaveLength(1)
  })
})

describe('GET /api/stores/:storeId/reviews と /reviews/stats', () => {
  it('returns reviews with the reviewer name attached', async () => {
    await request(app)
      .post('/api/reviews')
      .set('x-user-id', 'user-1')
      .send({ store_id: 'store-1', rating: 4, comment: '良い' })

    const res = await request(app).get('/api/stores/store-1/reviews')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].users).toEqual({ name: 'ユーザー1' })
  })

  it('returns empty stats for a store with no review_stats row', async () => {
    const res = await request(app).get('/api/stores/store-1/reviews/stats')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ store_id: 'store-1', avg_rating: 0, review_count: 0, last_updated: '' })
  })
})

describe('GET /api/auth/permissions', () => {
  it('returns the permissions mapped to the authenticated user\'s role', async () => {
    fakeClient.seed('roles', [{ id: 'role-user', name: 'user' }])
    fakeClient.seed('permissions', [
      { id: 'perm-1', resource: 'stores', action: 'read' },
      { id: 'perm-2', resource: 'reservations', action: 'create' },
    ])
    fakeClient.seed('role_permissions', [
      { role_id: 'role-user', permission_id: 'perm-1' },
      { role_id: 'role-user', permission_id: 'perm-2' },
    ])

    const res = await request(app).get('/api/auth/permissions').set('x-user-id', 'user-1')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: 'stores', action: 'read' }),
        expect.objectContaining({ resource: 'reservations', action: 'create' }),
      ])
    )
  })

  it('returns an empty list when the role has no mapped permissions', async () => {
    const res = await request(app).get('/api/auth/permissions').set('x-user-id', 'user-1')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})
