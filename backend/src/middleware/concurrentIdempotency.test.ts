import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express, { type Request, type Response } from 'express'
import supertest from 'supertest'
import { idempotency, InMemoryIdempotencyStore } from './idempotency.js'

const KEY = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

function buildConcurrentApp(store: InMemoryIdempotencyStore) {
  const app = express()
  app.use(express.json())

  let effectCount = 0

  app.post(
    '/pay',
    idempotency(store),
    async (_req: Request, res: Response) => {
      effectCount++
      // Simulate async work (e.g. DB write)
      await new Promise((r) => setTimeout(r, 50))
      res.status(201).json({ id: `txn-${effectCount}`, effectCount })
    }
  )

  return { app, getEffectCount: () => effectCount }
}

describe('Concurrent idempotency', () => {
  let store: InMemoryIdempotencyStore

  beforeEach(() => {
    store = new InMemoryIdempotencyStore(60_000)
  })

  afterEach(() => {
    store.stop()
  })

  it('two simultaneous requests with the same key produce exactly one effect', async () => {
    const { app, getEffectCount } = buildConcurrentApp(store)
    const agent = supertest(app)

    const [res1, res2] = await Promise.all([
      agent
        .post('/pay')
        .set('Idempotency-Key', KEY)
        .send({ amount: 100 }),
      agent
        .post('/pay')
        .set('Idempotency-Key', KEY)
        .send({ amount: 100 }),
    ])

    const statuses = [res1.status, res2.status].sort()
    const bodies = [res1.body, res2.body]

    // Exactly one succeeds with 201, the other is 409 in-flight
    expect(statuses).toEqual([201, 409])

    // Only one effect occurred
    expect(getEffectCount()).toBe(1)

    // The successful response has a real transaction id
    const successBody = bodies.find((b) => b.id)
    expect(successBody).toBeDefined()
    expect(successBody.id).toMatch(/^txn-/)
  })

  it('ten concurrent requests produce exactly one effect', async () => {
    const { app, getEffectCount } = buildConcurrentApp(store)
    const agent = supertest(app)

    const results = await Promise.all(
      Array(10)
        .fill(null)
        .map(() =>
          agent
            .post('/pay')
            .set('Idempotency-Key', KEY)
            .send({ amount: 50 })
        )
    )

    const successCount = results.filter((r) => r.status === 201).length
    const conflictCount = results.filter((r) => r.status === 409).length

    expect(successCount).toBe(1)
    expect(conflictCount).toBe(9)
    expect(getEffectCount()).toBe(1)
  })

  it('after first request completes, replay returns cached response', async () => {
    const { app } = buildConcurrentApp(store)
    const agent = supertest(app)

    const first = await agent
      .post('/pay')
      .set('Idempotency-Key', KEY)
      .send({ amount: 100 })

    expect(first.status).toBe(201)

    const second = await agent
      .post('/pay')
      .set('Idempotency-Key', KEY)
      .send({ amount: 100 })

    expect(second.status).toBe(201)
    expect(second.headers['x-idempotent-replay']).toBe('true')
    expect(second.body).toEqual(first.body)
  })

  it('different keys run concurrently without interference', async () => {
    const { app, getEffectCount } = buildConcurrentApp(store)
    const agent = supertest(app)

    const [res1, res2] = await Promise.all([
      agent
        .post('/pay')
        .set('Idempotency-Key', '11111111-1111-4111-8111-111111111111')
        .send({ amount: 100 }),
      agent
        .post('/pay')
        .set('Idempotency-Key', '22222222-2222-4222-8222-222222222222')
        .send({ amount: 200 }),
    ])

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
    expect(getEffectCount()).toBe(2)
  })
})
