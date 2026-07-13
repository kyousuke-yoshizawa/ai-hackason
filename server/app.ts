import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth.js'
import { storeMediaRouter } from './routes/storeMedia.js'
import { storesRouter } from './routes/stores.js'
import { usersRouter } from './routes/users.js'

export const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/stores', storesRouter)
app.use('/api/stores', storeMediaRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
