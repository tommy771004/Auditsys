import type { Response } from "express";

const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
};

/**
 * Sets the auth_token httpOnly cookie on the response.
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

/**
 * Clears the auth_token httpOnly cookie.
 */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
}
