jest.mock('../../api/_lib/supabaseAdmin', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { supabaseAdmin } from '../../api/_lib/supabaseAdmin'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { getActiveUser, requireAdmin, requireStoreAccess } from '../../api/_lib/authz'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

beforeEach(() => {
  fakeClient.reset()
})

// T04: is_active=false のユーザは全認可経路で拒否される
describe('getActiveUser', () => {
  it('returns the user when is_active is true', async () => {
    fakeClient.seed('users', [{ id: 'user-1', email: 'a@example.com', role: 'user', is_active: true }])

    const user = await getActiveUser('user-1')

    expect(user).toMatchObject({ id: 'user-1', email: 'a@example.com', role: 'user' })
  })

  it('returns null when is_active is false', async () => {
    fakeClient.seed('users', [{ id: 'user-1', email: 'a@example.com', role: 'admin', is_active: false }])

    const user = await getActiveUser('user-1')

    expect(user).toBeNull()
  })

  it('returns null when the user does not exist', async () => {
    const user = await getActiveUser('nonexistent')

    expect(user).toBeNull()
  })

  it('returns null when userId is undefined', async () => {
    const user = await getActiveUser(undefined)

    expect(user).toBeNull()
  })
})

describe('requireAdmin', () => {
  it('returns the user for an active admin', async () => {
    fakeClient.seed('users', [{ id: 'admin-1', email: 'admin@example.com', role: 'admin', is_active: true }])

    const user = await requireAdmin('admin-1')

    expect(user?.id).toBe('admin-1')
  })

  it('rejects a deactivated admin (is_active=false)', async () => {
    fakeClient.seed('users', [{ id: 'admin-1', email: 'admin@example.com', role: 'admin', is_active: false }])

    const user = await requireAdmin('admin-1')

    expect(user).toBeNull()
  })

  it('rejects a non-admin active user', async () => {
    fakeClient.seed('users', [{ id: 'user-1', email: 'user@example.com', role: 'user', is_active: true }])

    const user = await requireAdmin('user-1')

    expect(user).toBeNull()
  })
})

describe('requireStoreAccess', () => {
  it('allows an active admin regardless of store_managers membership', async () => {
    fakeClient.seed('users', [{ id: 'admin-1', email: 'admin@example.com', role: 'admin', is_active: true }])

    const user = await requireStoreAccess('admin-1', 'store-1')

    expect(user?.id).toBe('admin-1')
  })

  it('allows a store manager registered in store_managers for that store', async () => {
    fakeClient.seed('users', [{ id: 'manager-1', email: 'manager@example.com', role: 'store_manager', is_active: true }])
    fakeClient.seed('store_managers', [{ store_id: 'store-1', manager_id: 'manager-1' }])

    const user = await requireStoreAccess('manager-1', 'store-1')

    expect(user?.id).toBe('manager-1')
  })

  it('rejects a store manager not registered in store_managers for that store', async () => {
    fakeClient.seed('users', [{ id: 'manager-1', email: 'manager@example.com', role: 'store_manager', is_active: true }])
    fakeClient.seed('store_managers', [{ store_id: 'store-2', manager_id: 'manager-1' }])

    const user = await requireStoreAccess('manager-1', 'store-1')

    expect(user).toBeNull()
  })

  it('rejects a deactivated store manager even if registered in store_managers', async () => {
    fakeClient.seed('users', [{ id: 'manager-1', email: 'manager@example.com', role: 'store_manager', is_active: false }])
    fakeClient.seed('store_managers', [{ store_id: 'store-1', manager_id: 'manager-1' }])

    const user = await requireStoreAccess('manager-1', 'store-1')

    expect(user).toBeNull()
  })
})
