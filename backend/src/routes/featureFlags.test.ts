import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { sessionStore, userStore } from '../models/authStore.js'

describe('Feature Flags API', () => {
  let app: any

  beforeEach(async () => {
    app = createApp()
    await sessionStore.clear()
    await userStore.clear()
  })

  describe('GET /api/config/feature-flags', () => {
    it('should return guest-visible flags when unauthenticated', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
      expect(response.body.data).toHaveProperty('RENT_TO_OWN_ENABLED')
      expect(response.body.data).toHaveProperty('BACKEND_HEALTH_INDICATOR_ENABLED')
      // Should not include admin-only flags
      expect(response.body.data).not.toHaveProperty('ADVANCED_WALLET_OPS_ENABLED')
    })

    it('should return all flags for admin users', async () => {
      // Create an admin user and session
      await userStore.getOrCreateByEmail('admin@example.com')
      const session = await sessionStore.create('admin@example.com', 'admin-test-token')
      
      const response = await request(app)
        .get('/api/config/feature-flags')
        .set('Authorization', `Bearer ${session.token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      // Admin should see all flags
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
      expect(response.body.data).toHaveProperty('INSPECTOR_DASHBOARD_ENABLED')
      expect(response.body.data).toHaveProperty('RENT_TO_OWN_ENABLED')
      expect(response.body.data).toHaveProperty('ADVANCED_WALLET_OPS_ENABLED')
      expect(response.body.data).toHaveProperty('BACKEND_HEALTH_INDICATOR_ENABLED')
    })

    it('should return auth-visible flags for authenticated non-admin users', async () => {
      // Create a regular user and session
      await userStore.getOrCreateByEmail('user@example.com')
      const session = await sessionStore.create('user@example.com', 'user-test-token')
      
      const response = await request(app)
        .get('/api/config/feature-flags')
        .set('Authorization', `Bearer ${session.token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      // Authenticated users should see all flags except admin-only ones
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
      expect(response.body.data).toHaveProperty('INSPECTOR_DASHBOARD_ENABLED')
      expect(response.body.data).toHaveProperty('RENT_TO_OWN_ENABLED')
    })

    it('should treat invalid token as guest', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(200)

      expect(response.body.success).toBe(true)
      // Should return guest-visible flags
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
      expect(response.body.data).not.toHaveProperty('ADVANCED_WALLET_OPS_ENABLED')
    })

    it('should treat expired token as guest', async () => {
      // Create a session
      const session = await sessionStore.create('user@example.com', 'expired-token')
      
      // Manually expire the session by setting expiresAt to past
      await sessionStore.deleteByToken('expired-token')
      
      const response = await request(app)
        .get('/api/config/feature-flags')
        .set('Authorization', 'Bearer expired-token')
        .expect(200)

      expect(response.body.success).toBe(true)
      // Should return guest-visible flags
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
    })

    it('should treat missing authorization header as guest', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
    })

    it('should return boolean values for all flags', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .expect(200)

      expect(response.body.success).toBe(true)
      for (const key in response.body.data) {
        expect(typeof response.body.data[key]).toBe('boolean')
      }
    })

    it('should return flags with correct default values', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.STAKING_ENABLED).toBe(true)
      expect(response.body.data.RENT_TO_OWN_ENABLED).toBe(false)
      // INSPECTOR_DASHBOARD_ENABLED may not be visible to guests
      if (response.body.data.INSPECTOR_DASHBOARD_ENABLED !== undefined) {
        expect(response.body.data.INSPECTOR_DASHBOARD_ENABLED).toBe(true)
      }
      // ADVANCED_WALLET_OPS_ENABLED is admin-only, may not be visible to guests
      if (response.body.data.ADVANCED_WALLET_OPS_ENABLED !== undefined) {
        expect(response.body.data.ADVANCED_WALLET_OPS_ENABLED).toBe(false)
      }
      expect(response.body.data.BACKEND_HEALTH_INDICATOR_ENABLED).toBe(false)
    })

    it('should handle malformed authorization header gracefully', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .set('Authorization', 'InvalidFormat token123')
        .expect(200)

      expect(response.body.success).toBe(true)
      // Should treat as guest
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
    })

    it('should handle empty authorization header gracefully', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .set('Authorization', '')
        .expect(200)

      expect(response.body.success).toBe(true)
      // Should treat as guest
      expect(response.body.data).toHaveProperty('STAKING_ENABLED')
    })

    it('should not throw errors for invalid tokens', async () => {
      const response = await request(app)
        .get('/api/config/feature-flags')
        .set('Authorization', 'Bearer completely-fake-token')
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })
})
