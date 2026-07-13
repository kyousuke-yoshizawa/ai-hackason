/**
 * API Stub Implementations for Parallel Development
 *
 * These stubs provide mock implementations of all 30+ API endpoints
 * allowing frontend and backend to develop in parallel.
 * Replace with actual Supabase calls when backend is ready.
 */

import { supabase } from './supabase'

// ========================================
// PHASE 1: High Priority (MVP)
// ========================================

// Issue #18: Store CRUD Operations
export const storeApi = {
  // POST /api/stores
  async createStore(data: any) {
    const { data: store, error } = await supabase
      .from('stores')
      .insert([data])
      .select()
      .single()
    if (error) throw error
    return store
  },

  // GET /api/stores/:id
  async getStore(id: string) {
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return store
  },

  // GET /api/stores
  async listStores(limit = 50, offset = 0) {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .range(offset, offset + limit - 1)
    if (error) throw error
    return stores
  },

  // PATCH /api/stores/:id
  async updateStore(id: string, data: any) {
    const { data: store, error } = await supabase
      .from('stores')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return store
  },

  // DELETE /api/stores/:id
  async deleteStore(id: string) {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// Issue #20: User Role Management
export const roleApi = {
  // GET /api/roles
  async listRoles() {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
    if (error) throw error
    return roles
  },

  // POST /api/users/:id/roles
  async assignRole(userId: string, roleId: string, assignedStoreIds: string[] = []) {
    const { data, error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role_id: roleId, assigned_store_ids: assignedStoreIds }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // GET /api/users/:id/roles
  async getUserRoles(userId: string) {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`*, roles:role_id(*)`)
      .eq('user_id', userId)
    if (error) throw error
    return data
  },

  // PATCH /api/users/:id/roles/:roleId
  async updateUserRole(userId: string, roleId: string, assignedStoreIds: string[]) {
    const { data, error } = await supabase
      .from('user_roles')
      .update({ assigned_store_ids: assignedStoreIds })
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// Issue #23: Map & Coordinates
export const mapApi = {
  // GET /api/stores/map?x_min=...&x_max=...&y_min=...&y_max=...
  async getStoresInRange(xMin: number, xMax: number, yMin: number, yMax: number) {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, x_coord, y_coord')
      .gte('x_coord', xMin)
      .lte('x_coord', xMax)
      .gte('y_coord', yMin)
      .lte('y_coord', yMax)
    if (error) throw error
    return stores
  },
}

// Issue #24 & #25: Crowd Status & Email
export const crowdApi = {
  // GET /api/stores/:id/crowd-status
  async getCrowdStatus(storeId: string) {
    const { data: status, error } = await supabase
      .from('crowd_status')
      .select('*')
      .eq('store_id', storeId)
      .single()
    if (error) throw error
    return status
  },

  // PATCH /api/stores/:id/crowd-status
  async updateCrowdStatus(storeId: string, level: 'low' | 'medium' | 'high') {
    const { data: user } = await supabase.auth.getUser()
    const { data: status, error } = await supabase
      .from('crowd_status')
      .upsert({
        store_id: storeId,
        level,
        updated_by: user?.user?.id,
      })
      .select()
      .single()
    if (error) throw error

    // Record in history
    await supabase
      .from('crowd_history')
      .insert([{
        store_id: storeId,
        level,
        recorded_by: user?.user?.id,
      }])

    return status
  },

  // GET /api/stores/:id/crowd-history
  async getCrowdHistory(storeId: string, days = 7) {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data: history, error } = await supabase
      .from('crowd_history')
      .select('*')
      .eq('store_id', storeId)
      .gte('recorded_at', fromDate.toISOString())
      .order('recorded_at', { ascending: false })
    if (error) throw error
    return history
  },

  // Schedule email notifications
  async scheduleEmailNotifications() {
    // This would be called by a cron job
    const { data: user } = await supabase.auth.getUser()

    const { data: managers, error } = await supabase
      .from('store_managers')
      .select('*, stores(*)')

    if (error) throw error

    for (const manager of managers) {
      // Generate JWT token for one-time link
      const linkToken = await generateEmailLinkToken(manager.manager_id, manager.store_id)

      await supabase
        .from('email_notifications')
        .insert([{
          store_id: manager.store_id,
          manager_id: manager.manager_id,
          scheduled_time: new Date().toISOString(),
          link_token: linkToken,
        }])
    }
  },
}

// Helper function for email token generation
async function generateEmailLinkToken(userId: string, storeId: string): Promise<string> {
  // In production, use proper JWT signing
  const token = Buffer.from(`${userId}:${storeId}:${Date.now()}`).toString('base64')
  return token
}

// Issue #26: Real-time Crowd Display
export const realtimeApi = {
  // Subscribe to crowd status changes
  subscribeToCrowdStatus(storeId: string, callback: (data: any) => void) {
    const channel = supabase
      .channel(`crowd_status:store_id=eq.${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crowd_status', filter: `store_id=eq.${storeId}` },
        (payload: { new: unknown }) => callback(payload.new)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}

// ========================================
// PHASE 2: Medium Priority
// ========================================

// Issue #27: Likes
export const likesApi = {
  // POST /api/stores/:id/likes
  async toggleLike(storeId: string) {
    const { data: user } = await supabase.auth.getUser()
    const userId = user?.user?.id

    // Check if like exists
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single()

    if (existing) {
      // Delete like
      await supabase
        .from('likes')
        .delete()
        .eq('id', existing.id)
      return { liked: false }
    } else {
      // Create like
      await supabase
        .from('likes')
        .insert([{ user_id: userId, store_id: storeId }])
      return { liked: true }
    }
  },

  // GET /api/stores/:id/likes
  async getLikeCount(storeId: string) {
    const { count, error } = await supabase
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('store_id', storeId)

    if (error) throw error
    return count || 0
  },

  // GET /api/users/likes
  async getUserLikes() {
    const { data: user } = await supabase.auth.getUser()
    const { data: likes, error } = await supabase
      .from('likes')
      .select('store_id')
      .eq('user_id', user?.user?.id)

    if (error) throw error
    return likes?.map(l => l.store_id) || []
  },
}

// Issue #29: Reviews
export const reviewsApi = {
  // POST /api/stores/:id/reviews
  async createReview(storeId: string, rating: number, comment: string) {
    const { data: user } = await supabase.auth.getUser()
    const { data: review, error } = await supabase
      .from('reviews')
      .insert([{
        store_id: storeId,
        user_id: user?.user?.id,
        rating,
        comment,
      }])
      .select()
      .single()

    if (error) throw error

    // Update review stats
    await updateReviewStats(storeId)
    return review
  },

  // GET /api/stores/:id/reviews
  async getStoreReviews(storeId: string, limit = 20, offset = 0) {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*, users:user_id(email)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return reviews
  },

  // GET /api/stores/:id/reviews/stats
  async getReviewStats(storeId: string) {
    const { data: stats, error } = await supabase
      .from('review_stats')
      .select('*')
      .eq('store_id', storeId)
      .single()

    if (error) throw error
    return stats
  },
}

async function updateReviewStats(storeId: string) {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('store_id', storeId)

  if (!reviews) return

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  await supabase
    .from('review_stats')
    .upsert({
      store_id: storeId,
      total_reviews: reviews.length,
      average_rating: Math.round(avgRating * 100) / 100,
    })
}

// Issue #31: Crowd Analytics
export const analyticsApi = {
  // GET /api/stores/:id/analytics?period=date
  async getStoreAnalytics(storeId: string, period: string = 'today') {
    let dateRange = new Date()
    dateRange.setDate(dateRange.getDate() - 1)

    const { data: analytics, error } = await supabase
      .from('crowd_analytics')
      .select('*')
      .eq('store_id', storeId)
      .gte('date_period', period)

    if (error) throw error
    return analytics
  },

  // POST /api/analytics/batch (called by cron job)
  async batchProcessCrowdData() {
    // This would aggregate crowd_history into crowd_analytics
    // Called daily by scheduler
    return { processed: true }
  },
}

// Issue #33: Reservations
export const reservationsApi = {
  // POST /api/reservations
  async createReservation(storeId: string, data: any) {
    const { data: user } = await supabase.auth.getUser()
    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert([{
        store_id: storeId,
        user_id: user?.user?.id,
        ...data,
      }])
      .select()
      .single()

    if (error) throw error
    return reservation
  },

  // GET /api/reservations/:id
  async getReservation(id: string) {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return reservation
  },

  // GET /api/users/reservations
  async getUserReservations() {
    const { data: user } = await supabase.auth.getUser()
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, stores(*)')
      .eq('user_id', user?.user?.id)

    if (error) throw error
    return reservations
  },

  // PATCH /api/reservations/:id
  async updateReservation(id: string, data: any) {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return reservation
  },
}

// ========================================
// PHASE 3: Low Priority
// ========================================

// Issue #35 & #36: Store Media
export const mediaApi = {
  // POST /api/stores/:id/media
  async uploadMedia(storeId: string, file: File) {
    const { data: user } = await supabase.auth.getUser()
    const filePath = `${storeId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('store-media')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: media, error } = await supabase
      .from('store_media')
      .insert([{
        store_id: storeId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        media_type: file.type.startsWith('image') ? 'image' : 'document',
        created_by: user?.user?.id,
      }])
      .select()
      .single()

    if (error) throw error
    return media
  },

  // GET /api/stores/:id/media
  async getStoreMedia(storeId: string) {
    const { data: media, error } = await supabase
      .from('store_media')
      .select('*')
      .eq('store_id', storeId)

    if (error) throw error
    return media
  },

  // DELETE /api/media/:id
  async deleteMedia(mediaId: string) {
    const { data: media } = await supabase
      .from('store_media')
      .select('file_path')
      .eq('id', mediaId)
      .single()

    if (media) {
      await supabase.storage.from('store-media').remove([media.file_path])
    }

    await supabase.from('store_media').delete().eq('id', mediaId)
  },
}

// Issue #37 & #38: Error Management
export const errorApi = {
  // POST /api/errors (internal, called by error handler)
  async logError(errorData: any) {
    const { error } = await supabase
      .from('error_logs')
      .insert([errorData])

    if (error) console.error('Failed to log error:', error)
  },

  // GET /api/errors (admin only)
  async getErrors(limit = 50, offset = 0) {
    const { data: errors, error } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return errors
  },

  // PATCH /api/errors/:id
  async updateError(id: string, status: string, notes?: string) {
    const { data: user } = await supabase.auth.getUser()
    const { data: error, error: updateError } = await supabase
      .from('error_logs')
      .update({
        status,
        resolution_notes: notes,
        resolved_by: user?.user?.id,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return error
  },
}

export default {
  storeApi,
  roleApi,
  mapApi,
  crowdApi,
  realtimeApi,
  likesApi,
  reviewsApi,
  analyticsApi,
  reservationsApi,
  mediaApi,
  errorApi,
}
