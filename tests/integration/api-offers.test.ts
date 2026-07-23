/**
 * @jest-environment node
 */
// Issue #98（S004・オファー機能）: server/routes/offers.ts の CRUD・認可をsupertestで検証する

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

const validOffer = {
  store_id: 'store-1',
  description: '14-16時は狙い目！20%OFF',
  start_time: '14:00',
  end_time: '16:00',
}

beforeEach(() => {
  fakeClient.reset()
  fakeClient.seed('stores', [
    { id: 'store-1', name: 'テスト店舗1', deleted_at: null },
    { id: 'store-2', name: 'テスト店舗2', deleted_at: null },
  ])
  fakeClient.seed('users', [
    { id: 'admin-1', role: 'admin', is_active: true },
    { id: 'manager-1', role: 'store_manager', is_active: true },
    { id: 'manager-2', role: 'store_manager', is_active: true },
    { id: 'user-1', role: 'user', is_active: true },
  ])
  fakeClient.seed('store_managers', [
    { store_id: 'store-1', manager_id: 'manager-1' },
    { store_id: 'store-2', manager_id: 'manager-2' },
  ])
})

describe('POST /api/offers', () => {
  it('allows an admin to create an offer for any store', async () => {
    const res = await request(app).post('/api/offers').set('x-user-id', 'admin-1').send(validOffer)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      store_id: 'store-1',
      description: validOffer.description,
      start_time: '14:00',
      end_time: '16:00',
      weekdays_only: false,
      is_active: true,
    })
  })

  it('allows a store_manager to create an offer for their own store', async () => {
    const res = await request(app).post('/api/offers').set('x-user-id', 'manager-1').send(validOffer)

    expect(res.status).toBe(201)
  })

  it('rejects a store_manager creating an offer for a different store', async () => {
    const res = await request(app)
      .post('/api/offers')
      .set('x-user-id', 'manager-2')
      .send(validOffer)

    expect(res.status).toBe(403)
    expect(fakeClient.getRows('offers')).toHaveLength(0)
  })

  it('rejects a regular user', async () => {
    const res = await request(app).post('/api/offers').set('x-user-id', 'user-1').send(validOffer)

    expect(res.status).toBe(403)
  })

  it('returns 401 when x-user-id header is missing', async () => {
    const res = await request(app).post('/api/offers').send(validOffer)

    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid body (start_time not before end_time)', async () => {
    const res = await request(app)
      .post('/api/offers')
      .set('x-user-id', 'admin-1')
      .send({ ...validOffer, start_time: '16:00', end_time: '14:00' })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/offers', () => {
  it('returns 400 when store_id is missing', async () => {
    const res = await request(app).get('/api/offers')

    expect(res.status).toBe(400)
  })

  it('lists offers for the given store without requiring auth', async () => {
    await request(app).post('/api/offers').set('x-user-id', 'admin-1').send(validOffer)
    await request(app)
      .post('/api/offers')
      .set('x-user-id', 'admin-1')
      .send({ ...validOffer, store_id: 'store-2', description: '別店舗のオファー' })

    const res = await request(app).get('/api/offers').query({ store_id: 'store-1' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].store_id).toBe('store-1')
  })
})

describe('PUT /api/offers/:id', () => {
  async function createOfferAs(userId: string) {
    const res = await request(app).post('/api/offers').set('x-user-id', userId).send(validOffer)
    return res.body.id as string
  }

  it('allows the owning store_manager to update the offer', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app)
      .put(`/api/offers/${id}`)
      .set('x-user-id', 'manager-1')
      .send({ description: '更新後の内容' })

    expect(res.status).toBe(200)
    expect(res.body.description).toBe('更新後の内容')
  })

  it('allows an admin to update any offer', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app).put(`/api/offers/${id}`).set('x-user-id', 'admin-1').send({ is_active: false })

    expect(res.status).toBe(200)
    expect(res.body.is_active).toBe(false)
  })

  it('rejects a store_manager of a different store', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app)
      .put(`/api/offers/${id}`)
      .set('x-user-id', 'manager-2')
      .send({ description: '不正な更新' })

    expect(res.status).toBe(403)
  })

  it('rejects a regular user', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app).put(`/api/offers/${id}`).set('x-user-id', 'user-1').send({ description: 'x' })

    expect(res.status).toBe(403)
  })

  it('returns 404 for a non-existent offer id', async () => {
    const res = await request(app)
      .put('/api/offers/does-not-exist')
      .set('x-user-id', 'admin-1')
      .send({ description: 'x' })

    expect(res.status).toBe(404)
  })

  it('returns 400 when no updatable fields are provided', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app).put(`/api/offers/${id}`).set('x-user-id', 'manager-1').send({})

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/offers/:id', () => {
  async function createOfferAs(userId: string) {
    const res = await request(app).post('/api/offers').set('x-user-id', userId).send(validOffer)
    return res.body.id as string
  }

  it('allows the owning store_manager to delete the offer', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app).delete(`/api/offers/${id}`).set('x-user-id', 'manager-1')

    expect(res.status).toBe(200)
    expect(fakeClient.getRows('offers')).toHaveLength(0)
  })

  it('allows an admin to delete any offer', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app).delete(`/api/offers/${id}`).set('x-user-id', 'admin-1')

    expect(res.status).toBe(200)
  })

  it('rejects a store_manager of a different store', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app).delete(`/api/offers/${id}`).set('x-user-id', 'manager-2')

    expect(res.status).toBe(403)
    expect(fakeClient.getRows('offers')).toHaveLength(1)
  })

  it('rejects a regular user', async () => {
    const id = await createOfferAs('manager-1')

    const res = await request(app).delete(`/api/offers/${id}`).set('x-user-id', 'user-1')

    expect(res.status).toBe(403)
  })

  it('returns 404 for a non-existent offer id', async () => {
    const res = await request(app).delete('/api/offers/does-not-exist').set('x-user-id', 'admin-1')

    expect(res.status).toBe(404)
  })
})
