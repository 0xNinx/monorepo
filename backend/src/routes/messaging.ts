import { Router, Request, Response } from "express"
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js"
import { sessionStore } from "../models/authStore.js"
import {
  createStreamSession,
  cleanupDisconnectedStream,
  getActiveStreamCount,
} from "../services/messagingStreamService.js"
import { AppError } from "../errors/AppError.js"
import { ErrorCode } from "../errors/errorCodes.js"
import { logger } from "../utils/logger.js"

const router = Router()

/**
 * GET /api/v1/messaging/stream
 *
 * Authenticated SSE endpoint that pushes new-message and read-receipt events
 * for conversations the caller participates in.
 *
 * Authentication (choose one):
 *   - Header:  Authorization: Bearer <token>
 *   - Query:   ?token=<token>   (for EventSource API which cannot set custom headers)
 *
 * Query params:
 *   token (optional) — auth token for EventSource compatibility
 *   lastEventId (optional) — resume from a specific event ID
 *
 * Events:
 *   event: new_message
 *   event: read_receipt
 *
 * Heartbeat: a comment line (`: heartbeat`) every 30 s to keep proxies alive.
 */

// Lightweight auth middleware for SSE — checks both header and query param.
async function sseAuth(req: AuthenticatedRequest, _res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization
    const queryToken = req.query.token as string | undefined
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken

    if (!token) {
      next(new AppError(ErrorCode.UNAUTHORIZED, 401, "Authentication token required"))
      return
    }

    const session = await sessionStore.getByToken(token)
    if (!session) {
      next(new AppError(ErrorCode.UNAUTHORIZED, 401, "Invalid token"))
      return
    }

    req.user = {
      id: session.email,
      email: session.email,
      name: session.email.split("@")[0] || "User",
      role: "tenant",
    }
    next()
  } catch (err) {
    next(err)
  }
}

router.get(
  "/stream",
  sseAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id

    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })

    // Send initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: Date.now() })}\n\n`)

    const { success, client } = createStreamSession(userId, res)
    if (!success) {
      logger.warn("SSE stream limit reached for user", { userId })
      res.write(`event: error\ndata: ${JSON.stringify({ message: "Too many concurrent streams. Close another tab and retry." })}\n\n`)
      res.end()
      return
    }

    logger.info("SSE stream opened", {
      userId,
      activeStreams: getActiveStreamCount(),
    })

    req.on("close", () => {
      cleanupDisconnectedStream(res)
      logger.info("SSE stream closed", {
        userId,
        activeStreams: getActiveStreamCount(),
      })
    })

    req.on("error", () => {
      cleanupDisconnectedStream(res)
    })
  },
)

/**
 * GET /api/v1/messaging/stream/health
 * Returns the current active stream count (for monitoring).
 */
router.get(
  "/stream/health",
  (_req: Request, res: Response) => {
    res.json({ activeStreams: getActiveStreamCount() })
  },
)

export default router
