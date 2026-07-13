jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import createHandler from '../../api/reservations/index'
import cancelHandler from '../../api/reservations/[id]'
import availabilityHandler from '../../api/reservations/availability'
import { validateReservationRequest } from '../../backend/domains/reservations/validation'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

function createMockRes() {
  const res: Partial<VercelResponse> & { statusCode?: number; body?: unknown } = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res as VercelResponse
  }) as unknown as VercelResponse['status']
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res as VercelResponse
  }) as unknown as VercelResponse['json']
  res.setHeader = jest.fn(() => res as VercelResponse) as unknown as VercelResponse['setHeader']
  return res as VercelResponse & { statusCode: number; body: unknown }
}

function createPostReq(body: Record<string, unknown>): VercelRequest {
  return { method: 'POST', body, headers: {}, query: {} } as unknown as VercelRequest
}

function createPutReq(id: string, headers: Record<string, string> = {}): VercelRequest {
  return { method: 'PUT', query: { id }, headers, body: {} } as unknown as VercelRequest
}

function createGetReq(query: Record<string, string>): VercelRequest {
  return { method: 'GET', query, headers: {} } as unknown as VercelRequest
}

const NOW = new Date('2026-07-13T10:00:00')

beforeEach(() => {
  fakeClient.reset()
  fakeClient.seed('stores', [{ id: 'store-1', name: '渋谷店', open_time: '10:00', close_time: '22:00' }])
  fakeClient.seed('users', [{ id: 'user-1', role: 'user' }])
})

// TC-207-01: 予約作成の正常系・異常系
describe('POST /api/reservations (TC-207-01)', () => {
  it('creates a reservation when the request is valid', async () => {
    const res = createMockRes()

    await createHandler(
      createPostReq({
        store_id: 'store-1',
        user_id: 'user-1',
        reservation_date: '2099-01-01',
        reservation_time: '12:00',
        party_size: 2,
      }),
      res,
    )

    expect(res.statusCode).toBe(201)
    expect(fakeClient.getRows('reservations')).toHaveLength(1)
    expect(fakeClient.getRows('reservations')[0]).toMatchObject({ status: 'confirmed', party_size: 2 })
  })

  it('rejects a reservation outside business hours', async () => {
    const res = createMockRes()

    await createHandler(
      createPostReq({
        store_id: 'store-1',
        user_id: 'user-1',
        reservation_date: '2099-01-01',
        reservation_time: '08:00',
        party_size: 2,
      }),
      res,
    )

    expect(res.statusCode).toBe(422)
    expect(res.body).toMatchObject({ error: 'outside_business_hours' })
    expect(fakeClient.getRows('reservations')).toHaveLength(0)
  })

  it('rejects an invalid party size', async () => {
    const res = createMockRes()

    await createHandler(
      createPostReq({
        store_id: 'store-1',
        user_id: 'user-1',
        reservation_date: '2099-01-01',
        reservation_time: '12:00',
        party_size: 0,
      }),
      res,
    )

    expect(res.statusCode).toBe(400)
  })

  it('rejects a reservation for a nonexistent store', async () => {
    const res = createMockRes()

    await createHandler(
      createPostReq({
        store_id: 'store-999',
        user_id: 'user-1',
        reservation_date: '2099-01-01',
        reservation_time: '12:00',
        party_size: 2,
      }),
      res,
    )

    expect(res.statusCode).toBe(404)
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
    const res = createMockRes()

    await createHandler(
      createPostReq({
        store_id: 'store-1',
        user_id: 'user-1',
        reservation_date: '2099-01-01',
        reservation_time: '12:00',
        party_size: 2,
      }),
      res,
    )

    expect(res.statusCode).toBe(409)
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
    const res = createMockRes()

    await cancelHandler(createPutReq('res-1', { 'x-user-id': 'user-1' }), res)

    expect(res.statusCode).toBe(200)
    expect(fakeClient.getRows('reservations')[0]).toMatchObject({ status: 'cancelled' })
  })

  it('rejects cancellation by an unrelated user who is not a store manager or admin', async () => {
    fakeClient.seed('reservations', [
      { id: 'res-1', store_id: 'store-1', user_id: 'user-1', status: 'confirmed', cancelled_at: null },
    ])
    fakeClient.seed('users', [{ id: 'other-user', role: 'user' }])
    const res = createMockRes()

    await cancelHandler(createPutReq('res-1', { 'x-user-id': 'other-user' }), res)

    expect(res.statusCode).toBe(403)
    expect(fakeClient.getRows('reservations')[0]).toMatchObject({ status: 'confirmed' })
  })

  it('rejects cancelling an already-cancelled reservation', async () => {
    fakeClient.seed('reservations', [
      { id: 'res-1', store_id: 'store-1', user_id: 'user-1', status: 'cancelled', cancelled_at: new Date().toISOString() },
    ])
    const res = createMockRes()

    await cancelHandler(createPutReq('res-1', { 'x-user-id': 'user-1' }), res)

    expect(res.statusCode).toBe(409)
  })
})

describe('GET /api/reservations/availability', () => {
  it('reports availability for an open slot', async () => {
    const res = createMockRes()

    await availabilityHandler(
      createGetReq({ store_id: 'store-1', reservation_date: '2099-01-01', reservation_time: '12:00', party_size: '2' }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ available: true })
  })

  it('reports unavailability with a reason for an out-of-hours slot', async () => {
    const res = createMockRes()

    await availabilityHandler(
      createGetReq({ store_id: 'store-1', reservation_date: '2099-01-01', reservation_time: '23:00', party_size: '2' }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ available: false, reason: 'outside_business_hours' })
  })
})
