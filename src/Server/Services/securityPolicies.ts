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

/**
 * Extracts the embedded IPv4 address from an IPv4-mapped IPv6 address
 * (e.g. "::ffff:192.168.1.1" → "192.168.1.1"). Returns null if the address
 * is not in IPv4-mapped form.
 */
function extractIpv4MappedAddress(address: string): string | null {
  const prefix = "::ffff:";
  if (!address.startsWith(prefix)) {
    return null;
  }
  const candidate = address.slice(prefix.length);
  // Must look like a dotted-decimal IPv4 address (not a hex segment).
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(candidate) ? candidate : null;
}

function isPrivateOrReservedIpv6(address: string): boolean {
  const normalizedValue = address.toLowerCase();

  if (
    normalizedValue === "::"
    || normalizedValue === "::1"
    || normalizedValue.startsWith("fc")
    || normalizedValue.startsWith("fd")
    || normalizedValue.startsWith("fe8")
    || normalizedValue.startsWith("fe9")
    || normalizedValue.startsWith("fea")
    || normalizedValue.startsWith("feb")
  ) {
    return true;
  }

  // For IPv4-mapped addresses (::ffff:a.b.c.d), extract the embedded IPv4
  // and run the precise IPv4 private-range check rather than a string-prefix
  // match, which would incorrectly block public addresses like 172.1.x.x.
  const ipv4 = extractIpv4MappedAddress(normalizedValue);
  if (ipv4 !== null) {
    return isPrivateOrReservedIpv4(ipv4);
  }

  return false;
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
