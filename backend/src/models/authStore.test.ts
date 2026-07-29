import { describe, it, expect, beforeEach } from 'vitest'
import { sessionStore, userStore, otpChallengeStore, walletChallengeStore, refreshTokenStore } from './authStore.js'

describe('Authentication and Session Models', () => {
  beforeEach(async () => {
    // Clear all stores before each test
    userStore.clear()
    otpChallengeStore.clear()
    walletChallengeStore.clear()
    sessionStore.clear()
    refreshTokenStore.clear()
  })

  describe('UserStore', () => {
    describe('getOrCreateByEmail', () => {
      it('should create a new user when email does not exist', async () => {
        const user = await userStore.getOrCreateByEmail('new@example.com')

        expect(user).toBeDefined()
        expect(user.email).toBe('new@example.com')
        expect(user.id).toBeDefined()
      })

      it('should return existing user when email already exists', async () => {
        const user1 = await userStore.getOrCreateByEmail('existing@example.com')
        const user2 = await userStore.getOrCreateByEmail('existing@example.com')

        expect(user1.id).toBe(user2.id)
        expect(user1.email).toBe(user2.email)
      })

      it('should generate unique IDs for different users', async () => {
        const user1 = await userStore.getOrCreateByEmail('user1@example.com')
        const user2 = await userStore.getOrCreateByEmail('user2@example.com')

        expect(user1.id).not.toBe(user2.id)
      })
    })

    describe('getByEmail', () => {
      it('should return user when email exists', async () => {
        await userStore.getOrCreateByEmail('test@example.com')
        const user = await userStore.getByEmail('test@example.com')

        expect(user).toBeDefined()
        expect(user?.email).toBe('test@example.com')
      })

      it('should return undefined when email does not exist', async () => {
        const user = await userStore.getByEmail('nonexistent@example.com')

        expect(user).toBeUndefined()
      })
    })

    describe('getById', () => {
      it('should return user when ID exists', async () => {
        const createdUser = await userStore.getOrCreateByEmail('test@example.com')
        const user = await userStore.getById(createdUser.id)

        expect(user).toBeDefined()
        expect(user?.id).toBe(createdUser.id)
      })

      it('should return undefined when ID does not exist', async () => {
        const user = await userStore.getById('non-existent-id')

        expect(user).toBeUndefined()
      })
    })

    describe('linkWalletToUser', () => {
      it('should link wallet address to user', async () => {
        const user = await userStore.getOrCreateByEmail('test@example.com')
        const updatedUser = await userStore.linkWalletToUser('test@example.com', 'wallet-address-123')

        expect(updatedUser.walletAddress).toBe('wallet-address-123')
      })

      it('should lowercase wallet address', async () => {
        const user = await userStore.getOrCreateByEmail('test@example.com')
        const updatedUser = await userStore.linkWalletToUser('test@example.com', 'WALLET-ADDRESS-ABC')

        expect(updatedUser.walletAddress).toBe('wallet-address-abc')
      })
    })

    describe('getByWalletAddress', () => {
      it('should return user by wallet address', async () => {
        await userStore.getOrCreateByEmail('test@example.com')
        await userStore.linkWalletToUser('test@example.com', 'wallet-address-123')
        
        const user = await userStore.getByWalletAddress('wallet-address-123')

        expect(user).toBeDefined()
        expect(user?.email).toBe('test@example.com')
      })

      it('should be case-insensitive for wallet address', async () => {
        await userStore.getOrCreateByEmail('test@example.com')
        await userStore.linkWalletToUser('test@example.com', 'wallet-address-123')
        
        const user = await userStore.getByWalletAddress('WALLET-ADDRESS-123')

        expect(user).toBeDefined()
        expect(user?.email).toBe('test@example.com')
      })
    })
  })

  describe('SessionStore', () => {
    describe('create', () => {
      it('should create a new session for a user', async () => {
        const session = await sessionStore.create('test@example.com', 'test-token')

        expect(session).toBeDefined()
        expect(session.token).toBe('test-token')
        expect(session.email).toBe('test@example.com')
        expect(session.createdAt).toBeDefined()
      })

      it('should generate unique tokens for different sessions', async () => {
        const session1 = await sessionStore.create('test@example.com', 'token1')
        const session2 = await sessionStore.create('test@example.com', 'token2')

        expect(session1.token).not.toBe(session2.token)
      })

      it('should accept audit info', async () => {
        const session = await sessionStore.create('test@example.com', 'test-token', {
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        })

        expect(session).toBeDefined()
        expect(session.token).toBe('test-token')
      })
    })

    describe('getByToken', () => {
      it('should return session when token exists', async () => {
        await sessionStore.create('test@example.com', 'test-token')
        const session = await sessionStore.getByToken('test-token')

        expect(session).toBeDefined()
        expect(session?.token).toBe('test-token')
        expect(session?.email).toBe('test@example.com')
      })

      it('should return undefined when token does not exist', async () => {
        const session = await sessionStore.getByToken('non-existent-token')

        expect(session).toBeUndefined()
      })
    })

    describe('deleteByToken', () => {
      it('should delete session by token', async () => {
        await sessionStore.create('test@example.com', 'test-token')
        
        await sessionStore.deleteByToken('test-token')
        const session = await sessionStore.getByToken('test-token')

        expect(session).toBeUndefined()
      })

      it('should handle deleting non-existent token gracefully', async () => {
        await expect(sessionStore.deleteByToken('non-existent-token')).resolves.not.toThrow()
      })
    })
  })

  describe('OtpChallengeStore', () => {
    describe('set and getByEmail', () => {
      it('should store and retrieve OTP challenge by email', async () => {
        const challenge = {
          email: 'test@example.com',
          otpHash: 'hash-123',
          salt: 'salt-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await otpChallengeStore.set(challenge)
        const retrieved = await otpChallengeStore.getByEmail('test@example.com')

        expect(retrieved).toBeDefined()
        expect(retrieved?.email).toBe('test@example.com')
        expect(retrieved?.otpHash).toBe('hash-123')
      })

      it('should return undefined for non-existent email', async () => {
        const challenge = await otpChallengeStore.getByEmail('nonexistent@example.com')

        expect(challenge).toBeUndefined()
      })
    })

    describe('deleteByEmail', () => {
      it('should delete OTP challenge by email', async () => {
        const challenge = {
          email: 'test@example.com',
          otpHash: 'hash-123',
          salt: 'salt-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await otpChallengeStore.set(challenge)
        await otpChallengeStore.deleteByEmail('test@example.com')
        
        const retrieved = await otpChallengeStore.getByEmail('test@example.com')

        expect(retrieved).toBeUndefined()
      })
    })

    describe('updateAttempts', () => {
      it('should update attempt count', async () => {
        const challenge = {
          email: 'test@example.com',
          otpHash: 'hash-123',
          salt: 'salt-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await otpChallengeStore.set(challenge)
        await otpChallengeStore.updateAttempts('test@example.com', 3)
        
        const retrieved = await otpChallengeStore.getByEmail('test@example.com')

        expect(retrieved?.attempts).toBe(3)
      })
    })
  })

  describe('WalletChallengeStore', () => {
    describe('set and getByAddress', () => {
      it('should store and retrieve wallet challenge by address', async () => {
        const challenge = {
          address: 'wallet-address-123',
          challengeXdr: 'challenge-xdr-123',
          nonce: 'nonce-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await walletChallengeStore.set(challenge)
        const retrieved = await walletChallengeStore.getByAddress('wallet-address-123')

        expect(retrieved).toBeDefined()
        expect(retrieved?.address).toBe('wallet-address-123')
        expect(retrieved?.nonce).toBe('nonce-123')
      })

      it('should be case-insensitive for address', async () => {
        const challenge = {
          address: 'wallet-address-123',
          challengeXdr: 'challenge-xdr-123',
          nonce: 'nonce-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await walletChallengeStore.set(challenge)
        const retrieved = await walletChallengeStore.getByAddress('WALLET-ADDRESS-123')

        expect(retrieved).toBeDefined()
        expect(retrieved?.address).toBe('wallet-address-123')
      })

      it('should return undefined for non-existent address', async () => {
        const challenge = await walletChallengeStore.getByAddress('non-existent')

        expect(challenge).toBeUndefined()
      })
    })

    describe('deleteByAddress', () => {
      it('should delete wallet challenge by address', async () => {
        const challenge = {
          address: 'wallet-address-123',
          challengeXdr: 'challenge-xdr-123',
          nonce: 'nonce-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await walletChallengeStore.set(challenge)
        await walletChallengeStore.deleteByAddress('wallet-address-123')
        
        const retrieved = await walletChallengeStore.getByAddress('wallet-address-123')

        expect(retrieved).toBeUndefined()
      })
    })

    describe('updateAttempts', () => {
      it('should update attempt count', async () => {
        const challenge = {
          address: 'wallet-address-123',
          challengeXdr: 'challenge-xdr-123',
          nonce: 'nonce-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await walletChallengeStore.set(challenge)
        await walletChallengeStore.updateAttempts('wallet-address-123', 2)
        
        const retrieved = await walletChallengeStore.getByAddress('wallet-address-123')

        expect(retrieved?.attempts).toBe(2)
      })
    })

    describe('markAsUsed', () => {
      it('should mark challenge as used', async () => {
        const challenge = {
          address: 'wallet-address-123',
          challengeXdr: 'challenge-xdr-123',
          nonce: 'nonce-123',
          attempts: 0,
          expiresAt: new Date(Date.now() + 300000)
        }

        await walletChallengeStore.set(challenge)
        await walletChallengeStore.markAsUsed('wallet-address-123')
        
        const retrieved = await walletChallengeStore.getByAddress('wallet-address-123')

        expect(retrieved).toBeUndefined()
      })
    })
  })

  describe('RefreshTokenStore', () => {
    describe('create', () => {
      it('should create a new refresh token', async () => {
        const token = await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'refresh-token-123',
          family: 'family-1'
        })

        expect(token).toBeDefined()
        expect(token.userId).toBe('user-123')
        expect(token.email).toBe('test@example.com')
        expect(token.family).toBe('family-1')
        expect(token.expiresAt).toBeDefined()
      })

      it('should set expiry time in the future', async () => {
        const token = await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'refresh-token-123',
          family: 'family-1'
        })

        expect(token.expiresAt).toBeInstanceOf(Date)
        expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now())
      })
    })

    describe('findByRawToken', () => {
      it('should return token when it exists', async () => {
        await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'refresh-token-123',
          family: 'family-1'
        })
        
        const token = await refreshTokenStore.findByRawToken('refresh-token-123')

        expect(token).toBeDefined()
        expect(token?.userId).toBe('user-123')
      })

      it('should return undefined when token does not exist', async () => {
        const token = await refreshTokenStore.findByRawToken('non-existent-token')

        expect(token).toBeUndefined()
      })
    })

    describe('markUsed', () => {
      it('should mark token as used', async () => {
        await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'refresh-token-123',
          family: 'family-1'
        })
        
        await refreshTokenStore.markUsed('refresh-token-123')
        const token = await refreshTokenStore.findByRawToken('refresh-token-123')

        expect(token?.usedAt).toBeDefined()
        expect(token?.usedAt).toBeInstanceOf(Date)
      })
    })

    describe('invalidateFamily', () => {
      it('should invalidate all tokens in a family', async () => {
        await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'token1',
          family: 'family-1'
        })
        await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'token2',
          family: 'family-1'
        })
        
        const count = await refreshTokenStore.invalidateFamily('family-1')

        expect(count).toBe(2)
        
        const token1 = await refreshTokenStore.findByRawToken('token1')
        const token2 = await refreshTokenStore.findByRawToken('token2')

        expect(token1?.usedAt).toBeDefined()
        expect(token2?.usedAt).toBeDefined()
      })
    })

    describe('invalidateAllByUserId', () => {
      it('should invalidate all tokens for a user', async () => {
        await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'token1',
          family: 'family-1'
        })
        await refreshTokenStore.create({
          userId: 'user-123',
          email: 'test@example.com',
          rawToken: 'token2',
          family: 'family-2'
        })
        
        const count = await refreshTokenStore.invalidateAllByUserId('user-123')

        expect(count).toBe(2)
      })
    })
  })

  describe('Integration: Complete auth flow', () => {
    it('should handle complete OTP authentication flow', async () => {
      // Create user
      const user = await userStore.getOrCreateByEmail('test@example.com')

      // Create OTP challenge
      const challenge = {
        email: 'test@example.com',
        otpHash: 'hash-123',
        salt: 'salt-123',
        attempts: 0,
        expiresAt: new Date(Date.now() + 300000)
      }
      await otpChallengeStore.set(challenge)

      // Verify OTP exists
      const retrievedChallenge = await otpChallengeStore.getByEmail('test@example.com')
      expect(retrievedChallenge?.otpHash).toBe('hash-123')

      // Update attempts
      await otpChallengeStore.updateAttempts('test@example.com', 1)
      const updatedChallenge = await otpChallengeStore.getByEmail('test@example.com')
      expect(updatedChallenge?.attempts).toBe(1)

      // Create session after successful verification
      const session = await sessionStore.create('test@example.com', 'session-token')
      expect(session).toBeDefined()

      // Verify session exists
      const retrievedSession = await sessionStore.getByToken('session-token')
      expect(retrievedSession).toBeDefined()
      expect(retrievedSession?.email).toBe('test@example.com')

      // Logout (invalidate session)
      await sessionStore.deleteByToken('session-token')
      const deletedSession = await sessionStore.getByToken('session-token')
      expect(deletedSession).toBeUndefined()
    })

    it('should handle complete wallet authentication flow', async () => {
      // Create user
      const user = await userStore.getOrCreateByEmail('test@example.com')
      await userStore.linkWalletToUser('test@example.com', 'wallet-address-123')

      // Create wallet challenge
      const challenge = {
        address: 'wallet-address-123',
        challengeXdr: 'challenge-xdr-123',
        nonce: 'nonce-123',
        attempts: 0,
        expiresAt: new Date(Date.now() + 300000)
      }
      await walletChallengeStore.set(challenge)

      // Verify challenge exists
      const retrievedChallenge = await walletChallengeStore.getByAddress('wallet-address-123')
      expect(retrievedChallenge?.nonce).toBe('nonce-123')

      // Mark as used after successful verification
      await walletChallengeStore.markAsUsed('wallet-address-123')
      const usedChallenge = await walletChallengeStore.getByAddress('wallet-address-123')
      expect(usedChallenge).toBeUndefined()

      // Create session after successful verification
      const session = await sessionStore.create('test@example.com', 'session-token')
      expect(session).toBeDefined()

      // Create refresh token
      const refreshTokenRecord = await refreshTokenStore.create({
        userId: user.id,
        email: 'test@example.com',
        rawToken: 'refresh-token',
        family: 'family-1'
      })
      expect(refreshTokenRecord).toBeDefined()

      // Mark refresh token as used (rotation)
      await refreshTokenStore.markUsed('refresh-token')
      const usedToken = await refreshTokenStore.findByRawToken('refresh-token')
      expect(usedToken?.usedAt).toBeDefined()
    })
  })

  // Note: These tests use the in-memory fallback stores which are suitable
  // for deterministic testing without database dependencies. The stores
  // implement the same interface as the Postgres repositories, ensuring
  // consistency across environments.
})
