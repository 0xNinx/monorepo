import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import { ErrorCode, classifyError, type ErrorResponse } from '../errors/errorCodes.js'
import { chainUnavailable } from '../errors/factories.js'
import { isChainUnavailableError } from '../errors/chainUnavailable.js'
import { formatZodIssues } from '../errors/utils.js'
import { logger } from '../utils/logger.js'

const isProduction = process.env.NODE_ENV === 'production'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId

  /**
   * Centralized response sender
   */
  const send = (status: number, body: ErrorResponse) => {
    const classification = classifyError(body.error.code)
    const retryable = classification === 'transient'

    // Add Retry-After header for transient/rate-limit errors
    if (retryable && !res.getHeader('retry-after')) {
      res.setHeader('Retry-After', '5')
    }

    res
      .status(status)
      .setHeader('x-request-id', requestId)
      .json({
        ...body,
        requestId,
        error: {
          ...body.error,
          classification,
          retryable,
        },
      })
  }

  /**
   * 1️⃣ Controlled domain error
   */
  if (err instanceof AppError) {
    send(err.status, {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
    return
  }

  /**
   * 2️⃣ Chain / Soroban RPC unavailable (circuit open or timeout)
   */
  if (isChainUnavailableError(err)) {
    logger.warn('Chain unavailable', {
      requestId,
      errorName: err instanceof Error ? err.name : 'Unknown',
      errorMessage: err instanceof Error ? err.message : String(err),
      path: req.originalUrl,
      method: req.method,
    })

    const appErr = chainUnavailable()
    send(appErr.status, {
      error: {
        code: appErr.code,
        message: appErr.message,
      },
    })
    return
  }

  /**
   * 3️⃣ Zod validation error
   */
  if (err instanceof ZodError) {
    send(400, {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid request data',
        details: formatZodIssues(err.issues),
      },
    })
    return
  }

  /**
   * 4️⃣ Malformed JSON body
   */
  if (err instanceof SyntaxError && 'body' in err) {
    send(400, {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Malformed JSON in request body',
      },
    })
    return
  }

  /**
   * 5️⃣ Unknown / Unhandled Error
   */
  const safeMessage = 'An unexpected error occurred'

  // Structured logging (never log secrets)
  logger.error('Unhandled error', {
    requestId,
    errorName: err instanceof Error ? err.name : 'Unknown',
    errorMessage: err instanceof Error ? err.message : String(err),
    stack: !isProduction && err instanceof Error ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  })

  send(500, {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: isProduction
        ? safeMessage
        : err instanceof Error
        ? err.message
        : safeMessage,
    },
  })
}