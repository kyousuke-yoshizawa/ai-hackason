import express from 'express'
import { env } from './config/env.js'
import { mailRouter } from './routes/mail.js'

const app = express()

app.use(express.json())

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api/mail', mailRouter)

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`)
})
