import { assertSafeAuditTargetUrl } from "./securityPolicies";
import type { NetworkEvidence, NetworkResource, NetworkResourceType } from "../../types/networkEvidence.types";

const MAX_RESOURCES = 40;

export interface ProbeResourceResult {
  ok: boolean;
  status: number;
  durationMs: number;
  contentType: string | null;
  contentEncoding: string | null;
  transferBytes: number | null;
  encodedBytes: number | null;
  fromCache: boolean;
}

export interface ProbeDeps {
  fetchResource: (url: string) => Promise<ProbeResourceResult>;
  assertSafe: (url: string) => Promise<void>;
}

interface ParsedSubResource {
  url: string;
  type: NetworkResourceType;
  renderBlocking: boolean;
  isThirdParty: boolean;
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function isThirdParty(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).origin !== new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

/** Pure parse of static sub-resources from landing HTML. No network. */
export function parseSubResources(html: string, baseUrl: string): ParsedSubResource[] {
  const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  const headEnd = headMatch ? (headMatch.index ?? 0) + headMatch[0].length : html.length;
  const seen = new Set<string>();
  const out: ParsedSubResource[] = [];

  const push = (href: string, type: NetworkResourceType, renderBlocking: boolean) => {
    const url = resolveUrl(href, baseUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, type, renderBlocking, isThirdParty: isThirdParty(url, baseUrl) });
  };

  // Stylesheets: render-blocking when in <head>.
  for (const m of html.matchAll(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi)) {
    const tag = m[0];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) push(href, "stylesheet", (m.index ?? 0) < headEnd);
  }
  // Scripts with src: render-blocking when in <head> and not async/defer.
  for (const m of html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>|<script\b[^>]*src=["']([^"']+)["'][^>]*\/?>/gi)) {
    const tag = m[0];
    const href = m[1] ?? m[2];
    if (!href) continue;
    const isAsync = /\b(async|defer)\b/i.test(tag);
    push(href, "script", (m.index ?? 0) < headEnd && !isAsync);
  }
  // Images.
  for (const m of html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
    if (m[1]) push(m[1], "image", false);
  }
  return out;
}

/**
 * Fetches each parsed sub-resource (SSRF-guarded, capped) to measure timing,
 * compression, size and type. `deps` are injectable for hermetic tests; the
 * defaults use real `fetch` + the shared SSRF guard. Never throws.
 */
export async function collectNetworkProbe(
  html: string,
  baseUrl: string,
  deps: Partial<ProbeDeps> = {},
): Promise<NetworkEvidence> {
  const assertSafe = deps.assertSafe ?? ((url: string) => assertSafeAuditTargetUrl(url));
  const fetchResource = deps.fetchResource ?? defaultFetchResource;

  const parsed = parseSubResources(html, baseUrl);
  const truncated = parsed.length > MAX_RESOURCES;
  const slice = parsed.slice(0, MAX_RESOURCES);

  const resources: NetworkResource[] = [];
  for (const item of slice) {
    try {
      await assertSafe(item.url);
    } catch {
      continue; // SSRF-rejected — skip.
    }
    try {
      const r = await fetchResource(item.url);
      resources.push({
        url: item.url,
        type: item.type,
        startMs: 0,
        durationMs: r.durationMs,
        transferBytes: r.transferBytes,
        encodedBytes: r.encodedBytes,
        contentEncoding: r.contentEncoding,
        contentType: r.contentType,
        isThirdParty: item.isThirdParty,
        renderBlocking: item.renderBlocking,
        fromCache: r.fromCache,
      });
    } catch {
      continue;
    }
  }

  return {
    collector: "fetch-probe",
    finalUrl: baseUrl,
    resources,
    page: { fcpMs: null, lcpMs: null, longTasksMs: null, mainThreadBusyMs: null },
    truncated,
    notes: [
      "主執行緒 CPU 時間與 JavaScript 觸發的瀑布鏈需真實瀏覽器量測，本次未量測 (not measured by fetch probe).",
      "FCP/LCP 為瀏覽器量測指標，fetch 探針未量測 (not measured).",
    ],
  };
}

async function defaultFetchResource(url: string): Promise<ProbeResourceResult> {
  const started = Date.now();
  const response = await fetch(url, { redirect: "follow" });
  const durationMs = Date.now() - started;
  const buf = await response.arrayBuffer().catch(() => new ArrayBuffer(0));
  const contentLength = response.headers.get("content-length");
  return {
    ok: response.ok,
    status: response.status,
    durationMs,
    contentType: response.headers.get("content-type"),
    contentEncoding: response.headers.get("content-encoding"),
    transferBytes: contentLength ? Number(contentLength) : buf.byteLength || null,
    encodedBytes: buf.byteLength || (contentLength ? Number(contentLength) : null),
    fromCache: false,
  };
}
