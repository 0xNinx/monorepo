import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createBalanceRouter } from './balance.js'
import { StubSorobanAdapter } from '../soroban/stub-adapter.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { requestIdMiddleware } from '../middleware/requestId.js'

/**
 * NOTE ON SCOPE: createBalanceRouter() applies no auth middleware at all — every
 * route here (get balance, credit, debit) accepts an arbitrary `:account` path
 * param with no session/ownership check. This is a genuine gap (see PR
 * description), not something this test suite can paper over: the
 * "current behavior" tests below intentionally document that any caller can
 * read or mutate any account's balance today, rather than asserting a denial
 * that the code does not implement.
 */
function buildApp(): express.Express {
  const adapter = new StubSorobanAdapter({ rpcUrl: '', networkPassphrase: '' })
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json())
  app.use('/api/v1', createBalanceRouter(adapter))
  app.use(errorHandler)
  return app
}

describe('Balance Routes', () => {
  let app: express.Express

  beforeEach(() => {
    StubSorobanAdapter._testOnlyReset()
    app = buildApp()
  })

  describe('GET /api/v1/balance/:account', () => {
    it('returns a balance for an arbitrary account with no Authorization header at all', async () => {
      // Documents the current gap: there is no authenticateToken (or any auth) on this route.
      const res = await request(app).get('/api/v1/balance/GACCOUNT_NO_AUTH_TEST')
      expect(res.status).toBe(200)
      expect(res.body.account).toBe('GACCOUNT_NO_AUTH_TEST')
      expect(typeof res.body.balance).toBe('string')
    })

    it('rejects a blank account param', async () => {
      const res = await request(app).get('/api/v1/balance/%20')
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('returns a stable, deterministic non-negative balance on repeated reads with no intervening mutation', async () => {
      const first = await request(app).get('/api/v1/balance/GACCOUNT_STABLE').expect(200)
      const second = await request(app).get('/api/v1/balance/GACCOUNT_STABLE').expect(200)

      expect(second.body.balance).toBe(first.body.balance)
      expect(BigInt(second.body.balance)).toBeGreaterThanOrEqual(0n)
    })

    it('tracks balances independently per account (no cross-account bleed)', async () => {
      const accountA = await request(app).get('/api/v1/balance/GACCOUNT_ISO_A').expect(200)
      const accountB = await request(app).get('/api/v1/balance/GACCOUNT_ISO_B').expect(200)

      await request(app)
        .post('/api/v1/balance/GACCOUNT_ISO_A/credit')
        .send({ amount: '500' })
        .expect(200)

      const accountAAfter = await request(app).get('/api/v1/balance/GACCOUNT_ISO_A').expect(200)
      const accountBAfter = await request(app).get('/api/v1/balance/GACCOUNT_ISO_B').expect(200)

      expect(BigInt(accountAAfter.body.balance)).toBe(BigInt(accountA.body.balance) + 500n)
      // Crediting A must never change B's balance.
      expect(accountBAfter.body.balance).toBe(accountB.body.balance)
    })
  })

  describe('POST /api/v1/balance/:account/credit', () => {
    it('increases the balance by the credited amount', async () => {
      const before = await request(app).get('/api/v1/balance/GACCOUNT_CREDIT').expect(200)

      const res = await request(app)
        .post('/api/v1/balance/GACCOUNT_CREDIT/credit')
        .send({ amount: '250' })
        .expect(200)

      expect(BigInt(res.body.newBalance)).toBe(BigInt(before.body.balance) + 250n)
    })

    it('requires an amount string in the body', async () => {
      const res = await request(app)
        .post('/api/v1/balance/GACCOUNT_CREDIT_BAD/credit')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('can be called with no Authorization header at all (current gap — see PR description)', async () => {
      const res = await request(app)
        .post('/api/v1/balance/GACCOUNT_CREDIT_NO_AUTH/credit')
        .send({ amount: '100' })
      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/v1/balance/:account/debit', () => {
    it('decreases the balance by the debited amount, including down to exactly zero', async () => {
      const before = await request(app).get('/api/v1/balance/GACCOUNT_DEBIT').expect(200)
      const fullBalance = before.body.balance as string

      const res = await request(app)
        .post('/api/v1/balance/GACCOUNT_DEBIT/debit')
        .send({ amount: fullBalance })
        .expect(200)

      expect(res.body.newBalance).toBe('0')

      const after = await request(app).get('/api/v1/balance/GACCOUNT_DEBIT').expect(200)
      expect(after.body.balance).toBe('0')
    })

    it('rejects debiting more than the current balance', async () => {
      const before = await request(app).get('/api/v1/balance/GACCOUNT_OVERDRAW').expect(200)
      const tooMuch = (BigInt(before.body.balance) + 1_000_000n).toString()

      const res = await request(app)
        .post('/api/v1/balance/GACCOUNT_OVERDRAW/debit')
        .send({ amount: tooMuch })

      expect(res.status).toBeGreaterThanOrEqual(400)

      // Balance must be unchanged after a rejected debit.
      const after = await request(app).get('/api/v1/balance/GACCOUNT_OVERDRAW').expect(200)
      expect(after.body.balance).toBe(before.body.balance)
    })

    it('requires an amount string in the body', async () => {
      const res = await request(app)
        .post('/api/v1/balance/GACCOUNT_DEBIT_BAD/debit')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })
  })
})
