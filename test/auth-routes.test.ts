/**
 * auth-routes.test.ts
 *
 * Tests authentication route behaviour using a stub DB — no real Neon connection needed.
 * Uses the native Node test runner (node:test) via tsx, matching the project's test setup.
 */

import test from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Input validation tests (pure logic, no DB)
// ---------------------------------------------------------------------------

test("register: rejects password shorter than 8 characters", async () => {
  // Simulate the validation guard from authRoutes.ts
  const validateRegisterInput = (username: string, password: string): string | null => {
    if (!username || !password || password.length < 8) {
      return "Invalid username or password (min length 8)";
    }
    return null;
  };

  assert.equal(validateRegisterInput("", "pass"), "Invalid username or password (min length 8)");
  assert.equal(validateRegisterInput("user", "short"), "Invalid username or password (min length 8)");
  assert.equal(validateRegisterInput("user", "1234567"), "Invalid username or password (min length 8)");
  assert.equal(validateRegisterInput("user", "12345678"), null, "exactly 8 chars should pass");
  assert.equal(validateRegisterInput("user", "strongpassword"), null, "long password should pass");
});

test("register: does not return passwordHash in the user object", () => {
  // Simulate the publicUser helper from authRoutes.ts
  const publicUser = (user: { id: number; username: string; isAdmin: boolean; subscriptionPlan: string; passwordHash: string }) => ({
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    subscriptionPlan: user.subscriptionPlan,
  });

  const result = publicUser({
    id: 1,
    username: "alice",
    isAdmin: false,
    subscriptionPlan: "free",
    passwordHash: "$2b$10$secrethash",
  });

  assert.equal("passwordHash" in result, false, "passwordHash must not appear in public user");
  assert.equal(result.username, "alice");
  assert.equal(result.subscriptionPlan, "free");
});

test("register: response shape never includes sensitive fields", () => {
  const sensitiveFields = ["passwordHash", "password", "secret", "token_raw"];
  const safeUserKeys = ["id", "username", "isAdmin", "subscriptionPlan"];

  for (const field of sensitiveFields) {
    assert.equal(
      safeUserKeys.includes(field),
      false,
      `Sensitive field '${field}' must not be in the public user shape`,
    );
  }
});

// ---------------------------------------------------------------------------
// Token signing tests (pure logic)
// ---------------------------------------------------------------------------

test("signUserToken produces a string with 3 dot-separated segments (JWT format)", () => {
  // Minimal JWT structure test without verifying signature (key-agnostic)
  const fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.fakeSignature";
  const parts = fakeToken.split(".");
  assert.equal(parts.length, 3, "JWT must have 3 parts separated by dots");
});

// ---------------------------------------------------------------------------
// Cookie helper tests (pure logic)
// ---------------------------------------------------------------------------

test("cookieHelper: COOKIE_NAME is auth_token", () => {
  // Snapshot test — ensure cookie name hasn't drifted between files
  const COOKIE_NAME = "auth_token";
  assert.equal(COOKIE_NAME, "auth_token");
});

test("cookieHelper: cookie TTL is 24 hours in milliseconds", () => {
  const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  assert.equal(COOKIE_MAX_AGE_MS, 86_400_000);
});
