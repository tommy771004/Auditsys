import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getRequiredJwtSecret } from "../Services/securityPolicies";

const JWT_SECRET = getRequiredJwtSecret();

// ---------------------------------------------------------------------------
// Short-lived stream token store
// Maps one-time token → { user payload, expiresAt }.
// Tokens are valid for 30 seconds and consumed on first use, so the long-lived
// JWT never appears in a server access log URL.
// ---------------------------------------------------------------------------

interface StreamTokenEntry {
  user: Record<string, unknown>;
  expiresAt: number;
}

const streamTokenStore = new Map<string, StreamTokenEntry>();
const STREAM_TOKEN_TTL_MS = 30_000;

function pruneStreamTokens(): void {
  const now = Date.now();
  for (const [key, entry] of streamTokenStore.entries()) {
    if (now > entry.expiresAt) {
      streamTokenStore.delete(key);
    }
  }
}

/**
 * Issues a 30-second one-time stream token for the calling user.
 * Call this from `GET /api/scan/stream-token` (behind `authenticateToken`).
 */
export function issueStreamToken(user: Record<string, unknown>): { streamToken: string; expiresIn: number } {
  pruneStreamTokens();
  const streamToken = `sst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  streamTokenStore.set(streamToken, {
    user,
    expiresAt: Date.now() + STREAM_TOKEN_TTL_MS,
  });
  return { streamToken, expiresIn: STREAM_TOKEN_TTL_MS / 1000 };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Validates a JWT from Authorization header or httpOnly cookie.
 * Attaches the decoded payload to `req.user`.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const headerToken = req.headers.authorization?.split(" ")[1];
  const token = headerToken || req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }
    req.user = user;
    next();
  });
}

/**
 * Requires `req.user.isAdmin === true`. Must be used after `authenticateToken`.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/**
 * Validates an SSE stream request.
 * Priority:
 *   1. One-time stream token (`?token=sst_...`) from the store.
 *   2. Fallback: Authorization header / httpOnly cookie JWT (for direct testing).
 */
export function authenticateStream(req: Request, res: Response, next: NextFunction): void {
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;

  // Fast path: validate one-time stream token.
  if (queryToken) {
    pruneStreamTokens();
    const entry = streamTokenStore.get(queryToken);
    if (entry && Date.now() <= entry.expiresAt) {
      streamTokenStore.delete(queryToken); // consume — single use only
      req.user = entry.user as any;
      next();
      return;
    }
    // If it looks like a stream token but is invalid/expired, reject immediately.
    if (queryToken.startsWith("sst_")) {
      res.status(403).json({ error: "Stream token expired or invalid" });
      return;
    }
  }

  // Fallback: accept header / cookie JWT for direct testing.
  const token =
    (queryToken && !queryToken.startsWith("sst_") ? queryToken : undefined) ||
    req.headers.authorization?.split(" ")[1] ||
    req.cookies?.auth_token;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }
    req.user = user;
    next();
  });
}
