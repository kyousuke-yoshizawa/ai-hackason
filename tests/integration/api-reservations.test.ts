/**
 * @jest-environment node
 */
// supertest（内部でformidable/cuid2を使用）はjsdom環境のTextEncoder欠如と衝突するためnode環境を指定
// 予約系エンドポイントは api/reservations/*.ts (Vercel Functions) から
// server/routes/reservations.ts (Express Router) へ移設された。実体は
// server/app.ts の Express app に一本化されたため、ここでは実 app への
// supertest 統合テストとしてルーティングを検証する（挙動は移設前と同一）。

jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import request from 'supertest'
import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { app } from '../../server/app'
import { validateReservationRequest } from '../../backend/domains/reservations/validation'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

const NOW = new Date('2026-07-13T10:00:00')

beforeEach(() => {
  fakeClient.reset()
  fakeClient.seed('stores', [{ id: 'store-1', name: '渋谷店', open_time: '10:00', close_time: '22:00' }])
  fakeClient.seed('users', [{ id: 'user-1', role: 'user', is_active: true }])
})

// TC-207-01: 予約作成の正常系・異常系
describe('POST /api/reservations (TC-207-01)', () => {
  it('creates a reservation when the request is valid', async () => {
    const res = await request(app).post('/api/reservations').send({
      store_id: 'store-1',
      user_id: 'user-1',
      reservation_date: '2099-01-01',
      reservation_time: '12:00',
      party_size: 2,
    })

    expect(res.status).toBe(201)
    expect(fakeClient.getRows('reservations')).toHaveLength(1)
    expect(fakeClient.getRows('reservations')[0]).toMatchObject({ status: 'confirmed', party_size: 2 })
  })

  it('rejects a reservation outside business hours', async () => {
    const res = await request(app).post('/api/reservations').send({
      store_id: 'store-1',
      user_id: 'user-1',
      reservation_date: '2099-01-01',
      reservation_time: '08:00',
      party_size: 2,
    })

    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({ error: 'outside_business_hours' })
    expect(fakeClient.getRows('reservations')).toHaveLength(0)
  })

  it('rejects an invalid party size', async () => {
    const res = await request(app).post('/api/reservations').send({
      store_id: 'store-1',
      user_id: 'user-1',
      reservation_date: '2099-01-01',
      reservation_time: '12:00',
      party_size: 0,
    })

    expect(res.status).toBe(400)
  })

  it('rejects a reservation for a nonexistent store', async () => {
    const res = await request(app).post('/api/reservations').send({
      store_id: 'store-999',
      user_id: 'user-1',
      reservation_date: '2099-01-01',
      reservation_time: '12:00',
      party_size: 2,
    })

    expect(res.status).toBe(404)
  })

  it('rejects a reservation made too close to the requested time', async () => {
    fakeClient.seed('reservation_settings', [{ store_id: 'store-1', max_capacity: null, booking_advance_hours: 3 }])

    const result = await validateReservationRequest(
      { storeId: 'store-1', reservationDate: '2026-07-13', reservationTime: '12:00', partySize: 2 },
      NOW,
    )

    expect(result).toMatchObject({ valid: false, reason: 'too_soon' })
  })
})

// TC-207-INT-01: キャパシティ超過時の拒否確認
describe('capacity limit enforcement (TC-207-INT-01)', () => {
  beforeEach(() => {
    fakeClient.seed('reservation_settings', [{ store_id: 'store-1', max_capacity: 5, booking_advance_hours: 0 }])
  })

  it('allows a reservation within remaining capacity', async () => {
    fakeClient.seed('reservations', [
      { store_id: 'store-1', reservation_date: '2099-01-01', reservation_time: '12:00', party_size: 3, status: 'confirmed' },
    ])

    const result = await validateReservationRequest({
      storeId: 'store-1',
      reservationDate: '2099-01-01',
      reservationTime: '12:00',
      partySize: 2,
    })

    expect(result).toEqual({ valid: true })
  })

  it('rejects a reservation that would exceed the store capacity for that slot', async () => {
    fakeClient.seed('reservations', [
      { store_id: 'store-1', reservation_date: '2099-01-01', reservation_time: '12:00', party_size: 4, status: 'confirmed' },
    ])

    const res = await request(app).post('/api/reservations').send({
      store_id: 'store-1',
      user_id: 'user-1',
      reservation_date: '2099-01-01',
      reservation_time: '12:00',
      party_size: 2,
    })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ error: 'capacity_exceeded' })
  })

  it('ignores cancelled reservations when computing remaining capacity', async () => {
    fakeClient.seed('reservations', [
      { store_id: 'store-1', reservation_date: '2099-01-01', reservation_time: '12:00', party_size: 4, status: 'cancelled' },
    ])

    const result = await validateReservationRequest({
      storeId: 'store-1',
      reservationDate: '2099-01-01',
      reservationTime: '12:00',
      partySize: 4,
    })

    expect(result).toEqual({ valid: true })
  })
})

describe('PUT /api/reservations/:id (cancellation)', () => {
  it('allows the reservation owner to cancel', async () => {
    fakeClient.seed('reservations', [
      { id: 'res-1', store_id: 'store-1', user_id: 'user-1', status: 'confirmed', cancelled_at: null },
    ])

    const res = await request(app).put('/api/reservations/res-1').set('x-user-id', 'user-1').send({})

    expect(res.status).toBe(200)
    expect(fakeClient.getRows('reservations')[0]).toMatchObject({ status: 'cancelled' })
  })

  it('rejects cancellation by an unrelated user who is not a store manager or admin', async () => {
    fakeClient.seed('reservations', [
      { id: 'res-1', store_id: 'store-1', user_id: 'user-1', status: 'confirmed', cancelled_at: null },
    ])
    fakeClient.seed('users', [{ id: 'other-user', role: 'user', is_active: true }])

    const res = await request(app).put('/api/reservations/res-1').set('x-user-id', 'other-user').send({})

    expect(res.status).toBe(403)
    expect(fakeClient.getRows('reservations')[0]).toMatchObject({ status: 'confirmed' })
  })

  it('rejects cancelling an already-cancelled reservation', async () => {
    fakeClient.seed('reservations', [
      { id: 'res-1', store_id: 'store-1', user_id: 'user-1', status: 'cancelled', cancelled_at: new Date().toISOString() },
    ])

    const res = await request(app).put('/api/reservations/res-1').set('x-user-id', 'user-1').send({})

    expect(res.status).toBe(409)
  })
})

describe('GET /api/reservations/availability', () => {
  it('reports availability for an open slot', async () => {
    const res = await request(app)
      .get('/api/reservations/availability')
      .query({ store_id: 'store-1', reservation_date: '2099-01-01', reservation_time: '12:00', party_size: '2' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ available: true })
  })

  it('reports unavailability with a reason for an out-of-hours slot', async () => {
    const res = await request(app)
      .get('/api/reservations/availability')
      .query({ store_id: 'store-1', reservation_date: '2099-01-01', reservation_time: '23:00', party_size: '2' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ available: false, reason: 'outside_business_hours' })
  })
})
