import { describe, it, expect } from 'vitest'
import express, { type Request, type Response, type NextFunction } from 'express'
import supertest from 'supertest'
import { requestIdMiddleware } from './requestId.js'
import { requestContext, getRequestContext } from '../request-context.js'

function buildApp() {
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json())

  app.get('/ping', (req: Request, res: Response) => {
    res.json({
      requestId: req.requestId,
      contextRequestId: getRequestContext()?.requestId,
    })
  })

  app.post('/echo', (req: Request, res: Response) => {
    res.json({
      requestId: req.requestId,
      contextRequestId: getRequestContext()?.requestId,
      body: req.body,
    })
  })

  app.get('/error', (_req: Request, res: Response) => {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'test' },
    })
  })

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: err.message },
    })
  })

  return app
}

describe('Correlation ID propagation', () => {
  it('generates x-request-id and attaches to req.requestId', async () => {
    const app = buildApp()
    const res = await supertest(app).get('/ping')

    expect(res.status).toBe(200)
    expect(typeof res.headers['x-request-id']).toBe('string')
    expect(res.headers['x-request-id'].length).toBeGreaterThan(0)
    expect(res.body.requestId).toBe(res.headers['x-request-id'])
  })

  it('propagates incoming x-request-id', async () => {
    const app = buildApp()
    const incoming = 'trace-xyz-789'

    const res = await supertest(app)
      .get('/ping')
      .set('x-request-id', incoming)

    expect(res.headers['x-request-id']).toBe(incoming)
    expect(res.body.requestId).toBe(incoming)
  })

  it('requestId is available via AsyncLocalStorage in handlers', async () => {
    const app = buildApp()
    const incoming = 'ctx-test-456'

    const res = await supertest(app)
      .get('/ping')
      .set('x-request-id', incoming)

    expect(res.body.contextRequestId).toBe(incoming)
  })

  it('requestId propagates to POST handlers', async () => {
    const app = buildApp()
    const incoming = 'post-propagate-111'

    const res = await supertest(app)
      .post('/echo')
      .set('x-request-id', incoming)
      .send({ data: 'hello' })

    expect(res.body.requestId).toBe(incoming)
    expect(res.body.contextRequestId).toBe(incoming)
    expect(res.body.body.data).toBe('hello')
  })

  it('different requests get different IDs when no header is provided', async () => {
    const app = buildApp()

    const res1 = await supertest(app).get('/ping')
    const res2 = await supertest(app).get('/ping')

    expect(res1.body.requestId).not.toBe(res2.body.requestId)
  })

  it('x-request-id header is present on error responses', async () => {
    const app = buildApp()
    const incoming = 'error-propagate-999'

    const res = await supertest(app)
      .get('/error')
      .set('x-request-id', incoming)

    expect(res.headers['x-request-id']).toBe(incoming)
  })
})
