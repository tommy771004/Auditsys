import type { Request, Response, NextFunction } from "express";

/**
 * Typed application error with an HTTP status code.
 * Throw this from route handlers to trigger a clean JSON error response.
 *
 * @example
 *   throw new AppError(400, "Invalid request body");
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Client-facing error codes that map to HTTP 400.
 * Any other error message results in HTTP 502 (or 500 for AppError).
 */
const CLIENT_ERROR_CODES = new Set([
  "INVALID_AUDIT_PAYLOAD",
  "UNSAFE_AUDIT_TARGET",
  "AUDIT_TARGET_REDIRECT_LIMIT",
  "INVALID_JSON_BODY",
  "missing_url",
  "invalid_plan",
  "invalid_user_plan",
]);

/**
 * Returns true if the error message is a known client-caused error
 * (i.e. the caller sent a bad request, not a server fault).
 */
export function isClientError(message: string): boolean {
  return CLIENT_ERROR_CODES.has(message);
}

/**
 * Express error-handling middleware. Must be registered LAST with `app.use()`.
 * Converts `AppError` instances and unknown errors into a consistent JSON shape:
 *
 *   { "error": "<message>" }
 *
 * Stack traces are logged to stderr in development but never sent to the client.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ 
      error: {
        code: err.statusCode < 500 ? "client_error" : "server_error",
        message: err.message
      }
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[ErrorHandler]", err);
  }

  const statusCode = isClientError(message) ? 400 : 502;
  res.status(statusCode).json({ 
    error: {
      code: statusCode === 400 ? "client_error" : "server_error",
      message: process.env.NODE_ENV === "production" && statusCode >= 500 ? "Internal server error" : message
    }
  });
}
