import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { authRouter } from './routes/auth.js'
import { storeMediaRouter } from './routes/storeMedia.js'
import { storesRouter } from './routes/stores.js'
import { usersRouter } from './routes/users.js'
import { likesRouter, storeLikesRouter } from './routes/likes.js'
import { reviewsRouter, storeReviewsRouter } from './routes/reviews.js'
import { offersRouter } from './routes/offers.js'
import { sendError } from '../backend/http/respond.js'

export const app = express()

// 本番は Vercel の自ドメインを CORS_ALLOWED_ORIGINS に設定する（カンマ区切りで複数可）
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/stores', storesRouter)
app.use('/api/stores', storeMediaRouter)
app.use('/api/stores', storeLikesRouter)
app.use('/api/stores', storeReviewsRouter)
app.use('/api/likes', likesRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/offers', offersRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// 上記のいずれのルートにも一致しない /api/* パス
app.use('/api', (_req: Request, res: Response) => {
  sendError(res, 404, 'not_found', '指定されたエンドポイントは存在しません')
})

// グローバルエラーハンドラ（同期エラー・multerのファイルサイズ超過等）。
// Expressはミドルウェアの引数の数（4個）でエラーハンドラと判定するため、
// _req・_next は未使用でも省略できない
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error', err)

  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 413, 'file_too_large', 'ファイルサイズが上限を超えています')
  }

  return sendError(res, 500, 'internal_error', err instanceof Error ? err.message : 'unknown error')
})
