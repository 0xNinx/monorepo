import { Request, Response, NextFunction } from "express"
import { randomUUID } from "crypto"
import { requestContext } from "../request-context.js"
import { logger } from "../utils/logger.js"

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const incoming = req.header("x-request-id")

  const requestId =
    typeof incoming === "string" && incoming.trim() !== ""
      ? incoming
      : randomUUID()

  req.requestId = requestId
  res.setHeader("x-request-id", requestId)

  const store = { requestId, queryCount: 0 }
  requestContext.run(store, () => {
    res.on("finish", () => {
      if (process.env.NODE_ENV === "test") return
      logger.info("Request database queries", {
        requestId,
        queryCount: store.queryCount,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
      })
    })
    next()
  })
}
