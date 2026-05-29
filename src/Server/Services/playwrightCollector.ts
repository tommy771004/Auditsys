import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { assertSafeAuditTargetUrl, isPrivateOrReservedIpAddress } from "./securityPolicies";
import type { NetworkEvidence, NetworkResource, NetworkResourceType } from "../../types/networkEvidence.types";

const NAV_TIMEOUT_MS = 20000;
const MAX_RESOURCES = 150;

// `playwright` is an OPTIONAL peer dependency. It is loaded via a string-typed
// dynamic import so the project type-checks and bundles even when the package
// is not installed; the import only runs when this collector is invoked
// (BROWSER_COLLECTOR_MODE=playwright-real). If absent, the call rejects and the
// caller falls back / logs a warning.
const PLAYWRIGHT_MODULE = "playwright" as string;

function mapType(resourceType: string): NetworkResourceType {
  switch (resourceType) {
    case "document": return "document";
    case "script": return "script";
    case "stylesheet": return "stylesheet";
    case "image": return "image";
    case "font": return "font";
    case "fetch":
    case "xhr": return "fetch";
    case "media": return "media";
    default: return "other";
  }
}

/** Aborts in-page requests whose host resolves to a private/reserved IP (SSRF). */
async function isHostSafe(url: string): Promise<boolean> {
  try {
    const host = new URL(url).hostname;
    if (isIP(host) !== 0) return !isPrivateOrReservedIpAddress(host);
    const addresses = await dnsLookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && !addresses.some((a) => isPrivateOrReservedIpAddress(a.address));
  } catch {
    return false;
  }
}

export async function collectPlaywrightEvidence(targetUrl: string): Promise<NetworkEvidence> {
  await assertSafeAuditTargetUrl(targetUrl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playwright: any = await import(PLAYWRIGHT_MODULE);
  const chromium = playwright.chromium;

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const notes: string[] = [];
  const resources: NetworkResource[] = [];
  let truncated = false;

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const baseOrigin = new URL(targetUrl).origin;

    await page.route("**/*", async (route: any) => {
      const reqUrl: string = route.request().url();
      if (reqUrl.startsWith("http") && !(await isHostSafe(reqUrl))) {
        return route.abort();
      }
      return route.continue();
    });

    page.on("response", async (response: any) => {
      if (resources.length >= MAX_RESOURCES) { truncated = true; return; }
      const req = response.request();
      const timing = req.timing();
      const headers: Record<string, string> = await response.allHeaders().catch(() => ({}));
      const url: string = response.url();
      const contentLength = headers["content-length"] ? Number(headers["content-length"]) : null;
      resources.push({
        url,
        type: mapType(req.resourceType()),
        initiator: req.redirectedFrom()?.url(),
        startMs: Math.max(0, timing.startTime ?? 0),
        durationMs: Math.max(0, timing.responseEnd ?? 0),
        transferBytes: contentLength,
        encodedBytes: contentLength,
        contentEncoding: headers["content-encoding"] ?? null,
        contentType: headers["content-type"] ?? null,
        isThirdParty: (() => { try { return new URL(url).origin !== baseOrigin; } catch { return false; } })(),
        renderBlocking: false,
        fromCache: false,
      });
    });

    const navResponse = await page.goto(targetUrl, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    const finalUrl: string = navResponse?.url() ?? targetUrl;

    const paint = await page.evaluate(() => {
      const fcp = performance.getEntriesByName("first-contentful-paint")[0] as PerformanceEntry | undefined;
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      const lcp = lcpEntries[lcpEntries.length - 1] as PerformanceEntry | undefined;
      const longTasks = performance.getEntriesByType("longtask");
      const longTasksMs = longTasks.reduce((sum, e) => sum + e.duration, 0);
      return {
        fcpMs: fcp ? Math.round(fcp.startTime) : null,
        lcpMs: lcp ? Math.round(lcp.startTime) : null,
        longTasksMs: longTasks.length ? Math.round(longTasksMs) : null,
      };
    }).catch(() => ({ fcpMs: null, lcpMs: null, longTasksMs: null }));

    return {
      collector: "playwright-real",
      finalUrl,
      resources,
      page: { ...paint, mainThreadBusyMs: paint.longTasksMs },
      truncated,
      notes,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
