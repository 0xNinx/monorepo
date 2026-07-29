import { describe, it, expect, beforeEach } from 'vitest'
import express, { type Request, type Response } from 'express'
import supertest from 'supertest'
import {
  createComprehensiveRateLimiter,
  resetRateLimitStore,
} from './comprehensiveRateLimit.js'
import { RateLimitTiers } from '../config/rateLimits.js'
import { quotaService } from '../services/QuotaService.js'
import { vi } from 'vitest'

vi.mock('../services/QuotaService.js', () => ({
  quotaService: {
    getUserLimits: vi.fn(),
  },
}))

describe('Financial endpoint rate limiting', () => {
  let app: express.Application

  beforeEach(() => {
    resetRateLimitStore()
    vi.mocked(quotaService.getUserLimits).mockResolvedValue({
      requestsPerMinute: 100,
      requestsPerDay: 10000,
    })

    app = express()
    app.use((req: Request, _res: Response, next) => {
      ;(req as any).id = 'test-' + Math.random().toString(36).substr(2, 9)
      ;(req as any).user = { id: 'user-1', tier: 'pro' }
      next()
    })
    app.use(createComprehensiveRateLimiter())

    app.post('/staking/deposit/initiate', (_req: Request, res: Response) => {
      res.json({ ok: true, route: 'staking-deposit-initiate' })
    })
    app.post('/staking/stake', (_req: Request, res: Response) => {
      res.json({ ok: true, route: 'staking-stake' })
    })
    app.post('/staking/unstake', (_req: Request, res: Response) => {
      res.json({ ok: true, route: 'staking-unstake' })
    })
    app.post('/deposits/initiate', (_req: Request, res: Response) => {
      res.json({ ok: true, route: 'deposit-initiate' })
    })
    app.post('/wallet/ngn/withdraw/initiate', (_req: Request, res: Response) => {
      res.json({ ok: true, route: 'wallet-withdraw' })
    })
    app.post('/wallet/ngn/topup/initiate', (_req: Request, res: Response) => {
      res.json({ ok: true, route: 'wallet-topup' })
    })

    app.use((err: any, _req: Request, res: Response, _next: any) => {
      if (err.status === 429) {
        return res.status(429).json({
          error: { code: 'TOO_MANY_REQUESTS', message: err.message },
        })
      }
      res.status(500).json({ error: 'Internal error' })
    })
  })

  it('staking endpoints should use staking tier (limit 20, doubled for auth)', async () => {
    const agent = supertest(app)
    const res = await agent.post('/staking/stake')
    const limitHeader = parseInt(res.headers['x-ratelimit-limit'] as string)
    expect(limitHeader).toBe(RateLimitTiers.staking.limit * 2)
  })

  it('deposit endpoints should use deposit tier (limit 10, doubled for auth)', async () => {
    const agent = supertest(app)
    const res = await agent.post('/deposits/initiate')
    const limitHeader = parseInt(res.headers['x-ratelimit-limit'] as string)
    expect(limitHeader).toBe(RateLimitTiers.deposit.limit * 2)
  })

  it('wallet withdrawal should use wallet_withdrawal tier (limit 5, doubled for auth)', async () => {
    const agent = supertest(app)
    const res = await agent.post('/wallet/ngn/withdraw/initiate')
    const limitHeader = parseInt(res.headers['x-ratelimit-limit'] as string)
    expect(limitHeader).toBe(RateLimitTiers.wallet_withdrawal.limit * 2)
  })

  it('wallet topup should use wallet_topup tier (limit 10, doubled for auth)', async () => {
    const agent = supertest(app)
    const res = await agent.post('/wallet/ngn/topup/initiate')
    const limitHeader = parseInt(res.headers['x-ratelimit-limit'] as string)
    expect(limitHeader).toBe(RateLimitTiers.wallet_topup.limit * 2)
  })

  it('staking deposit/initiate should use staking tier (not deposit)', async () => {
    const agent = supertest(app)
    const res = await agent.post('/staking/deposit/initiate')
    const limitHeader = parseInt(res.headers['x-ratelimit-limit'] as string)
    expect(limitHeader).toBe(RateLimitTiers.staking.limit * 2)
  })

  it('should block wallet withdrawal after limit is exhausted', async () => {
    resetRateLimitStore()
    const strictApp = express()
    strictApp.use((req: Request, _res: Response, next) => {
      ;(req as any).id = 'test-' + Math.random().toString(36).substr(2, 9)
      ;(req as any).user = { id: 'user-w', tier: 'pro' }
      next()
    })
    strictApp.use(createComprehensiveRateLimiter())
    strictApp.post('/wallet/ngn/withdraw/initiate', (_req: Request, res: Response) => {
      res.json({ ok: true })
    })
    strictApp.use((err: any, _req: Request, res: Response, _next: any) => {
      if (err.status === 429) {
        return res.status(429).json({
          error: { code: 'TOO_MANY_REQUESTS', message: err.message },
        })
      }
      res.status(500).json({ error: 'Internal error' })
    })

    const agent = supertest(strictApp)
    const limit = RateLimitTiers.wallet_withdrawal.limit * 2

    for (let i = 0; i < limit; i++) {
      const res = await agent.post('/wallet/ngn/withdraw/initiate')
      expect(res.status).toBe(200)
    }

    const blocked = await agent.post('/wallet/ngn/withdraw/initiate')
    expect(blocked.status).toBe(429)
  })
})
