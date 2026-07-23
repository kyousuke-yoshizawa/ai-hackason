import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cancelReservation, createReservation, getReservationById, listStoreReservations, listUserReservations } from '../../backend/domains/reservations/repository.js'
import { validateReservationRequest } from '../../backend/domains/reservations/validation.js'
import { createReservationBodySchema, availabilityQuerySchema } from '../../backend/domains/reservations/schema.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { requireMethod } from '../../backend/http/method.js'
import { withErrorHandling } from '../../backend/http/withErrorHandling.js'
import { requireStoreAccess } from '../_http/requireStoreAccess.js'
import { getPathSegments } from '../_http/segments.js'

// POST /api/reservations { store_id, user_id, reservation_date, reservation_time, party_size }
// このハンドラのみ withErrorHandling でラップ（元の index.ts の挙動を維持）。
async function handleCreate(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return

  const parsed = createReservationBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const {
    store_id: storeId,
    user_id: userId,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: partySize,
  } = parsed.data

  const validation = await validateReservationRequest({
    storeId,
    reservationDate,
    reservationTime,
    partySize,
  })

  if (!validation.valid) {
    const statusByReason: Record<string, number> = {
      invalid_input: 400,
      store_not_found: 404,
      outside_business_hours: 422,
      too_soon: 422,
      capacity_exceeded: 409,
    }
    return sendError(res, statusByReason[validation.reason] ?? 422, validation.reason, validation.message)
  }

  const reservation = await createReservation({ storeId, userId, reservationDate, reservationTime, partySize })
  return res.status(201).json(reservation)
}
const handleCreateWrapped = withErrorHandling(handleCreate)

// PUT /api/reservations/:id — 予約キャンセル（本人、店舗責任者、adminのみ）
async function handleCancel(req: VercelRequest, res: VercelResponse, id: string | undefined) {
  if (!requireMethod(req, res, ['PUT'])) return

  if (typeof id !== 'string') {
    sendError(res, 400, 'validation_error', 'id is required')
    return
  }

  const reservation = await getReservationById(id)
  if (!reservation) {
    return sendError(res, 404, 'not_found', 'reservation not found')
  }

  const requesterId = req.headers['x-user-id']
  const isOwner = typeof requesterId === 'string' && requesterId === reservation.userId
  if (!isOwner) {
    const userId = await requireStoreAccess(req, res, reservation.storeId)
    if (!userId) return
  }

  if (reservation.status === 'cancelled') {
    return sendError(res, 409, 'already_cancelled', 'reservation is already cancelled')
  }

  const cancelled = await cancelReservation(id)
  return res.status(200).json(cancelled)
}

// GET /api/reservations/availability?store_id=X&reservation_date=YYYY-MM-DD&reservation_time=HH:MM&party_size=N
async function handleAvailability(req: VercelRequest, res: VercelResponse) {
  const parsed = availabilityQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const {
    store_id: storeId,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: partySize,
  } = parsed.data

  const result = await validateReservationRequest({ storeId, reservationDate, reservationTime, partySize })

  if (result.valid) {
    return res.status(200).json({ available: true })
  }

  // available:false は正常系レスポンス（エラーではない）ため sendError は使わない。
  // ただし reason/message のキー名は統一エラー契約と揃えている
  return res.status(200).json({ available: false, reason: result.reason, message: result.message })
}

// GET /api/reservations/store/:store_id （店舗責任者またはadminのみ）
async function handleListForStore(req: VercelRequest, res: VercelResponse, storeIdSegment: string | undefined) {
  if (typeof storeIdSegment !== 'string') {
    return sendError(res, 400, 'validation_error', 'store_id is required')
  }
  const storeId = storeIdSegment

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  const reservations = await listStoreReservations(storeId)
  return res.status(200).json(reservations)
}

// GET /api/reservations/user/:user_id
async function handleListForUser(req: VercelRequest, res: VercelResponse, userIdSegment: string | undefined) {
  if (typeof userIdSegment !== 'string') {
    return sendError(res, 400, 'validation_error', 'user_id is required')
  }
  const userId = userIdSegment

  const reservations = await listUserReservations(userId)
  return res.status(200).json(reservations)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = getPathSegments(req, '/api/reservations')

  if (segments.length === 0) {
    return handleCreateWrapped(req, res)
  }

  if (segments.length === 1 && segments[0] === 'availability') {
    return handleAvailability(req, res)
  }

  if (segments.length === 2 && segments[0] === 'store') {
    return handleListForStore(req, res, segments[1])
  }

  if (segments.length === 2 && segments[0] === 'user') {
    return handleListForUser(req, res, segments[1])
  }

  if (segments.length === 1) {
    return handleCancel(req, res, segments[0])
  }

  return sendError(res, 404, 'not_found', 'route not found')
}
