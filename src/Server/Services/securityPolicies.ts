import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export const UNSAFE_AUDIT_TARGET_ERROR = "UNSAFE_AUDIT_TARGET";
export const AUDIT_TARGET_REDIRECT_LIMIT_ERROR = "AUDIT_TARGET_REDIRECT_LIMIT_EXCEEDED";

const subscriptionPlans = ["free", "pro", "enterprise"] as const;

export type SubscriptionPlan = (typeof subscriptionPlans)[number];

export type LookupAddress = {
  address: string;
  family: number;
};

export type LookupFn = (hostname: string, options: { all: true; verbatim: true }) => Promise<LookupAddress[]>;

export function parseSubscriptionPlan(value: unknown): SubscriptionPlan | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return subscriptionPlans.includes(normalizedValue as SubscriptionPlan) ? (normalizedValue as SubscriptionPlan) : null;
}

export function canSelfServePlanChange(currentPlan: SubscriptionPlan, requestedPlan: SubscriptionPlan): { allowed: boolean; reason?: string } {
  if (requestedPlan === currentPlan || requestedPlan === "free") {
    return {
      allowed: true,
    };
  }

  return {
    allowed: false,
    reason: "plan_change_requires_admin",
  };
}

export function getRequiredJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  return secret;
}

function throwUnsafeAuditTarget(): never {
  throw new Error(UNSAFE_AUDIT_TARGET_ERROR);
}

function isBlockedHostname(hostname: string): boolean {
  const normalizedValue = hostname.trim().toLowerCase();

  return normalizedValue === "localhost"
    || normalizedValue.endsWith(".localhost")
    || normalizedValue.endsWith(".local")
    || normalizedValue.endsWith(".internal")
    || normalizedValue === "metadata.google.internal";
}

function isPrivateOrReservedIpv4(address: string): boolean {
  const octets = address.split(".").map((segment) => Number(segment));

  if (octets.length !== 4 || octets.some((segment) => !Number.isInteger(segment) || segment < 0 || segment > 255)) {
    return true;
  }

  const [first, second] = octets;

  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

function isPrivateOrReservedIpv6(address: string): boolean {
  const normalizedValue = address.toLowerCase();

  return normalizedValue === "::"
    || normalizedValue === "::1"
    || normalizedValue.startsWith("fc")
    || normalizedValue.startsWith("fd")
    || normalizedValue.startsWith("fe8")
    || normalizedValue.startsWith("fe9")
    || normalizedValue.startsWith("fea")
    || normalizedValue.startsWith("feb")
    || normalizedValue.startsWith("::ffff:127.")
    || normalizedValue.startsWith("::ffff:10.")
    || normalizedValue.startsWith("::ffff:169.254.")
    || normalizedValue.startsWith("::ffff:172.")
    || normalizedValue.startsWith("::ffff:192.168.");
}

export function isPrivateOrReservedIpAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    return isPrivateOrReservedIpv4(address);
  }

  if (family === 6) {
    return isPrivateOrReservedIpv6(address);
  }

  return true;
}

export async function assertSafeAuditTargetUrl(rawUrl: string, lookupFn: LookupFn = dnsLookup): Promise<void> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throwUnsafeAuditTarget();
  }

  if ((parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") || parsedUrl.username || parsedUrl.password) {
    throwUnsafeAuditTarget();
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    throwUnsafeAuditTarget();
  }

  if (isIP(parsedUrl.hostname) !== 0) {
    if (isPrivateOrReservedIpAddress(parsedUrl.hostname)) {
      throwUnsafeAuditTarget();
    }

    return;
  }

  let addresses: LookupAddress[];

  try {
    addresses = await lookupFn(parsedUrl.hostname, { all: true, verbatim: true });
  } catch {
    throwUnsafeAuditTarget();
  }

  if (addresses.length === 0 || addresses.some((entry) => isPrivateOrReservedIpAddress(entry.address))) {
    throwUnsafeAuditTarget();
  }
}
