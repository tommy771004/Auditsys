import test from "node:test";
import assert from "node:assert/strict";
import { collectDeterministicEvidence } from "../src/Server/Services/deterministicCollector.ts";
import {
  UNSAFE_AUDIT_TARGET_ERROR,
  assertSafeAuditTargetUrl,
  canSelfServePlanChange,
  getRequiredJwtSecret,
  isPrivateOrReservedIpAddress,
  parseSubscriptionPlan,
  type LookupFn,
} from "../src/Server/Services/securityPolicies.ts";
import { resolveAdminBootstrapConfig } from "../src/db/adminBootstrap.ts";

test("getRequiredJwtSecret fails closed when JWT_SECRET is missing", () => {
  assert.throws(() => getRequiredJwtSecret({}), /JWT_SECRET is required/);
  assert.equal(getRequiredJwtSecret({ JWT_SECRET: "  secret-value  " }), "secret-value");
});

test("resolveAdminBootstrapConfig only enables env-based bootstrap with a strong password", () => {
  assert.equal(resolveAdminBootstrapConfig({}), null);
  assert.equal(resolveAdminBootstrapConfig({ BOOTSTRAP_ADMIN_USERNAME: "admin" }), null);
  assert.throws(
    () => resolveAdminBootstrapConfig({ BOOTSTRAP_ADMIN_USERNAME: "admin", BOOTSTRAP_ADMIN_PASSWORD: "short" }),
    /BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters/,
  );
  assert.deepEqual(
    resolveAdminBootstrapConfig({
      BOOTSTRAP_ADMIN_USERNAME: " admin ",
      BOOTSTRAP_ADMIN_PASSWORD: " very-strong-password ",
    }),
    {
      username: "admin",
      password: "very-strong-password",
    },
  );
});

test("self-serve plan changes only allow no-op requests or downgrades to free", () => {
  assert.equal(parseSubscriptionPlan("free"), "free");
  assert.equal(parseSubscriptionPlan("enterprise"), "enterprise");
  assert.equal(parseSubscriptionPlan("vip"), null);

  assert.deepEqual(canSelfServePlanChange("free", "free"), { allowed: true });
  assert.deepEqual(canSelfServePlanChange("enterprise", "free"), { allowed: true });
  assert.deepEqual(canSelfServePlanChange("pro", "enterprise"), {
    allowed: false,
    reason: "plan_change_requires_admin",
  });
});

test("network policy blocks loopback and private IP targets", () => {
  assert.equal(isPrivateOrReservedIpAddress("127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIpAddress("10.0.0.5"), true);
  assert.equal(isPrivateOrReservedIpAddress("192.168.1.8"), true);
  assert.equal(isPrivateOrReservedIpAddress("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIpAddress("::1"), true);
});

test("assertSafeAuditTargetUrl rejects unsafe destinations and accepts public hosts", async () => {
  const publicLookup: LookupFn = async () => [{ address: "93.184.216.34", family: 4 }];
  const privateLookup: LookupFn = async () => [{ address: "127.0.0.1", family: 4 }];

  await assert.doesNotReject(() => assertSafeAuditTargetUrl("https://example.com/audit", publicLookup));
  await assert.rejects(() => assertSafeAuditTargetUrl("ftp://example.com/file", publicLookup), new RegExp(UNSAFE_AUDIT_TARGET_ERROR));
  await assert.rejects(() => assertSafeAuditTargetUrl("http://127.0.0.1/internal", publicLookup), new RegExp(UNSAFE_AUDIT_TARGET_ERROR));
  await assert.rejects(() => assertSafeAuditTargetUrl("https://metadata.google.internal/", publicLookup), new RegExp(UNSAFE_AUDIT_TARGET_ERROR));
  await assert.rejects(() => assertSafeAuditTargetUrl("https://corp.example/internal", privateLookup), new RegExp(UNSAFE_AUDIT_TARGET_ERROR));
});

test("collectDeterministicEvidence fails closed for loopback targets before any fetch is made", async () => {
  const result = await collectDeterministicEvidence({
    url: "http://127.0.0.1:34567/internal",
    goals: [],
    stack: [],
  });

  assert.equal(result.status, "failed");
  assert.equal(result.error, UNSAFE_AUDIT_TARGET_ERROR);
});

test("IPv6 SSRF: ::ffff: mapped addresses use precise numeric range check", () => {
  // Private ranges — must be blocked
  assert.equal(isPrivateOrReservedIpAddress("::ffff:10.0.0.1"), true,       "::ffff:10.x is private");
  assert.equal(isPrivateOrReservedIpAddress("::ffff:192.168.1.1"), true,    "::ffff:192.168.x is private");
  assert.equal(isPrivateOrReservedIpAddress("::ffff:172.16.0.1"), true,     "::ffff:172.16 is private (172.16.0.0/12 start)");
  assert.equal(isPrivateOrReservedIpAddress("::ffff:172.31.255.255"), true, "::ffff:172.31 is private (172.16.0.0/12 end)");
  assert.equal(isPrivateOrReservedIpAddress("::ffff:127.0.0.1"), true,      "::ffff:127.x is loopback");

  // Public ranges — must NOT be blocked (regression guard for the old string-prefix bug)
  assert.equal(isPrivateOrReservedIpAddress("::ffff:172.1.0.1"), false,     "::ffff:172.1 is PUBLIC — was incorrectly blocked before fix");
  assert.equal(isPrivateOrReservedIpAddress("::ffff:172.15.255.255"), false,"::ffff:172.15 is PUBLIC (just below 172.16)");
  assert.equal(isPrivateOrReservedIpAddress("::ffff:172.32.0.1"), false,    "::ffff:172.32 is PUBLIC (just above 172.31)");
  assert.equal(isPrivateOrReservedIpAddress("::ffff:8.8.8.8"), false,       "::ffff:8.8.8.8 is PUBLIC (Google DNS)");
});

test("IPv6 SSRF: pure IPv6 private ranges are blocked", () => {
  assert.equal(isPrivateOrReservedIpAddress("fc00::1"), true,               "fc00::/7 ULA is private");
  assert.equal(isPrivateOrReservedIpAddress("fd12::1"), true,               "fd00::/8 ULA is private");
  assert.equal(isPrivateOrReservedIpAddress("fe80::1"), true,               "fe80::/10 link-local is private");
  assert.equal(isPrivateOrReservedIpAddress("2001:4860:4860::8888"), false, "Google IPv6 DNS is public");
});
