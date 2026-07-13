/**
 * @jest-environment node
 */
// T09: server/routes/{stores,users,auth}.ts に新設した zod 検証の実地確認。
// これらのルートは元々 supertest による実 Express app への統合テストが存在しなかった
// （既存の api-stores.test.ts はローカルモック関数のみでテストしており実コードを検証していない）。

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
  fakeClient.seed('users', [{ id: 'admin-1', role: 'admin', is_active: true }])
})

describe('POST /api/stores validation (T09)', () => {
  it('rejects non-numeric x/y coordinates with a validation_error', async () => {
    const res = await request(app)
      .post('/api/stores')
      .set('x-user-id', 'admin-1')
      .send({ name: 'テスト店舗', category: 'カフェ', x: 'invalid', y: 10 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
    expect(res.body.message).toBeDefined()
  })

  it('rejects a missing required field', async () => {
    const res = await request(app)
      .post('/api/stores')
      .set('x-user-id', 'admin-1')
      .send({ category: 'カフェ', x: 1, y: 2 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('creates a store when x/y are valid numbers', async () => {
    const res = await request(app)
      .post('/api/stores')
      .set('x-user-id', 'admin-1')
      .send({ name: 'テスト店舗', category: 'カフェ', x: 10, y: 20 })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('テスト店舗')
  })
})

describe('POST /api/users validation (T09)', () => {
  it('rejects an invalid email format', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('x-user-id', 'admin-1')
      .send({ email: 'not-an-email', password: 'password123', name: 'テスト' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('rejects an invalid role enum value', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('x-user-id', 'admin-1')
      .send({ email: 'user@example.com', password: 'password123', name: 'テスト', role: 'superadmin' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('creates a user with a valid payload', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('x-user-id', 'admin-1')
      .send({ email: 'user@example.com', password: 'password123', name: 'テスト' })

    expect(res.status).toBe(201)
    expect(res.body.email).toBe('user@example.com')
  })
})

describe('POST /api/auth/login validation (T09)', () => {
  it('rejects a missing password with a validation_error', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('rejects an invalid email format before hitting the database', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'x' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })
})
