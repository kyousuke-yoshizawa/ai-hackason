import { Router } from 'express'
import { requireAdminOrStoreManager, requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { asyncHandler } from '../../backend/http/asyncHandler.js'
import { requireStoreAccess } from '../../backend/auth/authz.js'
import { availabilityQuerySchema, createReservationBodySchema } from '../../backend/domains/reservations/schema.js'
import { validateReservationRequest } from '../../backend/domains/reservations/validation.js'
import {
  cancelReservation,
  createReservation,
  getReservationById,
  listStoreReservations,
  listUserReservations,
} from '../../backend/domains/reservations/repository.js'

// POST /api/reservations、GET /api/reservations/availability、
// GET /api/reservations/store/:store_id、GET /api/reservations/user/:user_id、
// PUT /api/reservations/:id にマウントする
export const reservationsRouter = Router()

// POST /api/reservations { store_id, user_id, reservation_date, reservation_time, party_size }
reservationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
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
    res.status(201).json(reservation)
  }),
)

// GET /api/reservations/availability?store_id=X&reservation_date=YYYY-MM-DD&reservation_time=HH:MM&party_size=N
reservationsRouter.get(
  '/availability',
  asyncHandler(async (req, res) => {
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
    res.status(200).json({ available: false, reason: result.reason, message: result.message })
  }),
)

// GET /api/reservations/store/:store_id （店舗責任者またはadminのみ）
reservationsRouter.get(
  '/store/:store_id',
  requireAuth,
  requireAdminOrStoreManager('store_id'),
  asyncHandler(async (req, res) => {
    const reservations = await listStoreReservations(req.params.store_id)
    res.status(200).json(reservations)
  }),
)

// GET /api/reservations/user/:user_id
reservationsRouter.get(
  '/user/:user_id',
  asyncHandler(async (req, res) => {
    const reservations = await listUserReservations(req.params.user_id)
    res.status(200).json(reservations)
  }),
)

// PUT /api/reservations/:id — 予約キャンセル（本人、店舗責任者、adminのみ）
reservationsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params

    const reservation = await getReservationById(id)
    if (!reservation) {
      return sendError(res, 404, 'not_found', 'reservation not found')
    }

    const isOwner = req.authedUser!.id === reservation.userId
    if (!isOwner) {
      const user = await requireStoreAccess(req.authedUser!.id, reservation.storeId)
      if (!user) {
        return sendError(res, 403, 'forbidden', 'store manager or admin role required')
      }
    }

    if (reservation.status === 'cancelled') {
      return sendError(res, 409, 'already_cancelled', 'reservation is already cancelled')
    }

    const cancelled = await cancelReservation(id)
    res.status(200).json(cancelled)
  }),
)
