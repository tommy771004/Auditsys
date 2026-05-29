# Network Bottleneck Deep-Dive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream a zh-TW "Network Bottleneck Deep-Dive" into the live `ExecutionTerminal`, driven by real per-resource network evidence from a fetch sub-resource probe (no deps) and an optional real Playwright collector, with browser-only metrics labeled when unmeasured.

**Architecture:** Three layers. Layer 1 collects `NetworkEvidence` (fetch probe; Playwright opt-in). Layer 2 is a pure analyzer producing `BottleneckFinding[]`. Layer 3 formats findings to zh-TW `{level,message}` log lines and the `/api/scan/stream` handler emits them via `sendLog`. Tests are hermetic via injectable fetch.

**Tech Stack:** TypeScript, Express 5 SSE, node `--test` via `tsx`, existing `securityPolicies.assertSafeAuditTargetUrl`, optional `playwright`.

**Spec:** `docs/superpowers/specs/2026-05-29-network-bottleneck-deep-dive-design.md`

---

## File Structure

- `src/types/networkEvidence.types.ts` — shared isomorphic types (NetworkResource, NetworkEvidence, BottleneckFinding, BottleneckLogLine).
- `src/Server/Services/networkProbeCollector.ts` — pure `parseSubResources` + `collectNetworkProbe` (injectable fetch).
- `src/Server/Services/networkBottleneckAnalyzer.ts` — pure `analyzeNetworkBottlenecks`.
- `src/Server/Services/networkReportFormatter.ts` — pure `formatBottleneckReport`.
- `src/Server/Services/playwrightCollector.ts` — real Playwright collector (opt-in, added last).
- `server.ts` — wire collect→analyze→format into `/api/scan/stream`.
- `test/networkProbeCollector.test.ts`, `test/networkBottleneckAnalyzer.test.ts`, `test/networkReportFormatter.test.ts`.

---

## Task 1: Shared network evidence types

**Files:**
- Create: `src/types/networkEvidence.types.ts`

- [ ] **Step 1: Write the types file**

```ts
import type { SSELogLevel } from "./liveAudit.types";

export type NetworkResourceType =
  | "document" | "script" | "stylesheet" | "image" | "font" | "fetch" | "media" | "other";

/** One network request observed for the target page. */
export interface NetworkResource {
  url: string;
  type: NetworkResourceType;
  /** Requesting URL — populated by the Playwright collector only. */
  initiator?: string;
  startMs: number;
  durationMs: number;
  transferBytes: number | null;
  encodedBytes: number | null;
  contentEncoding: string | null; // "gzip" | "br" | null
  contentType: string | null;
  isThirdParty: boolean;
  /** Head + synchronous (CSS, or script without async/defer). */
  renderBlocking: boolean;
  fromCache: boolean;
}

/** Page-level paint/CPU metrics — Playwright only; null when not measured. */
export interface NetworkPageMetrics {
  fcpMs: number | null;
  lcpMs: number | null;
  longTasksMs: number | null;
  mainThreadBusyMs: number | null;
}

export interface NetworkEvidence {
  collector: "playwright-real" | "fetch-probe";
  finalUrl: string;
  resources: NetworkResource[];
  page: NetworkPageMetrics;
  /** True when a resource cap was hit. */
  truncated: boolean;
  /** Honesty labels for dimensions the active collector could not measure. */
  notes: string[];
}

export type BottleneckCategory =
  | "waterfall" | "render-blocking" | "uncompressed" | "image-format" | "third-party" | "slow-resource";

export interface BottleneckFinding {
  severity: "critical" | "warning" | "info";
  target: string;          // file / API / host
  measuredMs: number | null;
  category: BottleneckCategory;
  diagnosis: string;       // zh-TW
  resolution: string;      // zh-TW
  /** True only when every figure in this finding traces to a real measurement. */
  measured: boolean;
}

export interface BottleneckLogLine {
  level: SSELogLevel;
  message: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep networkEvidence || echo "NONE in new file"`
Expected: `NONE in new file` (project has 43 pre-existing unrelated errors; do not regress that count).

- [ ] **Step 3: Commit**

```bash
git add src/types/networkEvidence.types.ts
git commit -m "feat(network): shared network evidence + bottleneck types"
```

---

## Task 2: Fetch sub-resource probe collector

**Files:**
- Create: `src/Server/Services/networkProbeCollector.ts`
- Test: `test/networkProbeCollector.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSubResources, collectNetworkProbe } from "../src/Server/Services/networkProbeCollector";

const HTML = `<!doctype html><html><head>
  <link rel="stylesheet" href="/site.css">
  <script src="/app.js"></script>
  <script src="https://cdn.thirdparty.com/tag.js" async></script>
</head><body>
  <img src="/hero.jpg">
  <script src="/defer.js" defer></script>
</body></html>`;

test("parseSubResources classifies render-blocking, third-party, and type", () => {
  const resources = parseSubResources(HTML, "https://example.com/");
  const byUrl = Object.fromEntries(resources.map((r) => [r.url, r]));

  assert.equal(byUrl["https://example.com/site.css"].type, "stylesheet");
  assert.equal(byUrl["https://example.com/site.css"].renderBlocking, true);

  assert.equal(byUrl["https://example.com/app.js"].type, "script");
  assert.equal(byUrl["https://example.com/app.js"].renderBlocking, true); // head, no async/defer

  assert.equal(byUrl["https://cdn.thirdparty.com/tag.js"].isThirdParty, true);
  assert.equal(byUrl["https://cdn.thirdparty.com/tag.js"].renderBlocking, false); // async

  assert.equal(byUrl["https://example.com/hero.jpg"].type, "image");
  assert.equal(byUrl["https://example.com/hero.jpg"].renderBlocking, false);

  assert.equal(byUrl["https://example.com/defer.js"].renderBlocking, false); // defer
});

test("collectNetworkProbe measures via injected fetch and never throws", async () => {
  const evidence = await collectNetworkProbe(HTML, "https://example.com/", {
    fetchResource: async (url) => ({
      ok: true,
      status: 200,
      durationMs: url.endsWith(".css") ? 700 : 120,
      contentType: url.endsWith(".css") ? "text/css" : "application/javascript",
      contentEncoding: url.endsWith(".css") ? null : "br",
      transferBytes: 20000,
      encodedBytes: 20000,
      fromCache: false,
    }),
    assertSafe: async () => {},
  });

  assert.equal(evidence.collector, "fetch-probe");
  assert.equal(evidence.resources.length, 5);
  const css = evidence.resources.find((r) => r.url.endsWith("site.css"));
  assert.equal(css?.durationMs, 700);
  assert.equal(css?.contentEncoding, null);
  // Browser-only fields are null + noted.
  assert.equal(evidence.page.fcpMs, null);
  assert.ok(evidence.notes.some((n) => /未量測|not measured/i.test(n)));
});

test("collectNetworkProbe skips SSRF-rejected resources", async () => {
  const evidence = await collectNetworkProbe(
    `<head><script src="http://169.254.169.254/meta.js"></script></head>`,
    "https://example.com/",
    {
      fetchResource: async () => { throw new Error("should not fetch"); },
      assertSafe: async () => { throw new Error("UNSAFE_AUDIT_TARGET"); },
    },
  );
  assert.equal(evidence.resources.length, 0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import tsx --test test/networkProbeCollector.test.ts`
Expected: FAIL — module not found / no exports.

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --import tsx --test test/networkProbeCollector.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/Server/Services/networkProbeCollector.ts test/networkProbeCollector.test.ts
git commit -m "feat(network): fetch sub-resource probe collector (SSRF-guarded, hermetic tests)"
```

---

## Task 3: Bottleneck analyzer

**Files:**
- Create: `src/Server/Services/networkBottleneckAnalyzer.ts`
- Test: `test/networkBottleneckAnalyzer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeNetworkBottlenecks } from "../src/Server/Services/networkBottleneckAnalyzer";
import type { NetworkEvidence, NetworkResource } from "../src/types/networkEvidence.types";

function resource(over: Partial<NetworkResource>): NetworkResource {
  return {
    url: "https://example.com/a.js", type: "script", startMs: 0, durationMs: 100,
    transferBytes: 1000, encodedBytes: 1000, contentEncoding: "br", contentType: "application/javascript",
    isThirdParty: false, renderBlocking: false, fromCache: false, ...over,
  };
}

function evidence(resources: NetworkResource[], over: Partial<NetworkEvidence> = {}): NetworkEvidence {
  return {
    collector: "fetch-probe", finalUrl: "https://example.com/", resources,
    page: { fcpMs: null, lcpMs: null, longTasksMs: null, mainThreadBusyMs: null },
    truncated: false, notes: [], ...over,
  };
}

test("flags a slow resource as critical with a measured ms", () => {
  const findings = analyzeNetworkBottlenecks(evidence([resource({ durationMs: 1500 })]));
  const slow = findings.find((f) => f.category === "slow-resource");
  assert.equal(slow?.severity, "critical");
  assert.equal(slow?.measured, true);
  assert.equal(slow?.measuredMs, 1500);
});

test("flags render-blocking head CSS", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ url: "https://example.com/s.css", type: "stylesheet", renderBlocking: true, durationMs: 200 }),
  ]));
  assert.ok(findings.some((f) => f.category === "render-blocking"));
});

test("flags uncompressed large text resource", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ type: "script", contentEncoding: null, transferBytes: 50000, encodedBytes: 50000 }),
  ]));
  assert.ok(findings.some((f) => f.category === "uncompressed"));
});

test("flags legacy image format over size threshold", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ url: "https://example.com/h.jpg", type: "image", contentType: "image/jpeg", transferBytes: 200000, encodedBytes: 200000 }),
  ]));
  assert.ok(findings.some((f) => f.category === "image-format"));
});

test("emits a measured:false info finding for waterfall chains when no initiator data", () => {
  const findings = analyzeNetworkBottlenecks(evidence([resource({})]));
  const wf = findings.find((f) => f.category === "waterfall");
  assert.equal(wf?.measured, false);
  assert.equal(wf?.severity, "info");
});

test("third-party CPU finding is measured:false without longTasksMs", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ url: "https://cdn.x.com/t.js", isThirdParty: true, transferBytes: 90000, encodedBytes: 90000 }),
  ]));
  const tp = findings.find((f) => f.category === "third-party");
  assert.ok(tp);
  assert.equal(tp?.measured, false); // no CPU profiling in fetch-probe mode
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import tsx --test test/networkBottleneckAnalyzer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { BottleneckFinding, NetworkEvidence, NetworkResource } from "../../types/networkEvidence.types";

const SLOW_CRITICAL_MS = 1000;
const SLOW_WARNING_MS = 500;
const UNCOMPRESSED_MIN_BYTES = 10 * 1024;
const IMAGE_MIN_BYTES = 100 * 1024;
const COMPRESSIBLE: ReadonlySet<string> = new Set(["script", "stylesheet", "fetch", "document"]);
const LEGACY_IMAGE = /image\/(jpeg|png|gif)/i;

function bytesOf(r: NetworkResource): number {
  return r.encodedBytes ?? r.transferBytes ?? 0;
}

function shortName(url: string): string {
  try {
    const u = new URL(url);
    const file = u.pathname.split("/").filter(Boolean).pop();
    return file ? `${u.hostname}/${file}` : u.hostname;
  } catch {
    return url;
  }
}

export function analyzeNetworkBottlenecks(evidence: NetworkEvidence): BottleneckFinding[] {
  const findings: BottleneckFinding[] = [];

  for (const r of evidence.resources) {
    // Slow resource.
    if (r.durationMs >= SLOW_WARNING_MS) {
      findings.push({
        severity: r.durationMs >= SLOW_CRITICAL_MS ? "critical" : "warning",
        target: shortName(r.url),
        measuredMs: r.durationMs,
        category: "slow-resource",
        diagnosis: `此資源回應耗時 ${r.durationMs}ms，拖慢頁面載入。`,
        resolution: "啟用 HTTP/2 多工、加上邊緣快取 (CDN)，並檢查伺服器處理時間。",
        measured: true,
      });
    }
    // Render-blocking.
    if (r.renderBlocking) {
      findings.push({
        severity: "warning",
        target: shortName(r.url),
        measuredMs: r.durationMs,
        category: "render-blocking",
        diagnosis: `此資源位於 <head> 且為同步載入，會阻塞首次內容繪製 (FCP)。`,
        resolution: r.type === "script"
          ? "為指令碼加上 async 或 defer，或移至 body 末端。"
          : "內聯關鍵 CSS，其餘樣式以非阻塞方式 (media/print onload) 載入。",
        measured: true,
      });
    }
    // Uncompressed.
    if (COMPRESSIBLE.has(r.type) && r.contentEncoding === null && bytesOf(r) >= UNCOMPRESSED_MIN_BYTES) {
      findings.push({
        severity: "warning",
        target: shortName(r.url),
        measuredMs: null,
        category: "uncompressed",
        diagnosis: `此文字資源約 ${Math.round(bytesOf(r) / 1024)}KB 未啟用 gzip/brotli 壓縮。`,
        resolution: "在伺服器或 CDN 啟用 brotli（或 gzip）壓縮回應封包。",
        measured: true,
      });
    }
    // Legacy image format.
    if (r.type === "image" && r.contentType && LEGACY_IMAGE.test(r.contentType) && bytesOf(r) >= IMAGE_MIN_BYTES) {
      findings.push({
        severity: "warning",
        target: shortName(r.url),
        measuredMs: null,
        category: "image-format",
        diagnosis: `此圖片約 ${Math.round(bytesOf(r) / 1024)}KB，使用舊式格式 (${r.contentType})。`,
        resolution: "改用 WebP/AVIF 並提供響應式尺寸 (srcset)。",
        measured: true,
      });
    }
  }

  // Third-party aggregate.
  const thirdParty = evidence.resources.filter((r) => r.isThirdParty);
  if (thirdParty.length > 0) {
    const totalKb = Math.round(thirdParty.reduce((sum, r) => sum + bytesOf(r), 0) / 1024);
    const hasCpu = evidence.page.longTasksMs !== null;
    findings.push({
      severity: thirdParty.length >= 5 ? "warning" : "info",
      target: `${thirdParty.length} 個第三方資源`,
      measuredMs: hasCpu ? evidence.page.longTasksMs : null,
      category: "third-party",
      diagnosis: hasCpu
        ? `第三方資源共 ${totalKb}KB，主執行緒長任務累計 ${evidence.page.longTasksMs}ms。`
        : `第三方資源共 ${totalKb}KB（傳輸量為實測）；主執行緒 CPU 時間需真實瀏覽器量測，本次未量測。`,
      resolution: "延後或移除非必要的追蹤/廣告指令碼，並以 facade 模式延後載入。",
      measured: hasCpu,
    });
  }

  // Waterfall chains — initiator data only exists in the Playwright collector.
  const hasInitiators = evidence.resources.some((r) => r.initiator);
  if (!hasInitiators) {
    findings.push({
      severity: "info",
      target: "瀑布鏈分析",
      measuredMs: null,
      category: "waterfall",
      diagnosis: "JavaScript 觸發的序列請求鏈需真實瀏覽器的 initiator 追蹤，本次未量測。",
      resolution: "啟用 Playwright 收集器 (BROWSER_COLLECTOR_MODE=playwright-real) 以分析瀑布鏈。",
      measured: false,
    });
  }

  return findings;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --import tsx --test test/networkBottleneckAnalyzer.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/Server/Services/networkBottleneckAnalyzer.ts test/networkBottleneckAnalyzer.test.ts
git commit -m "feat(network): bottleneck analyzer with measured-only findings"
```

---

## Task 4: zh-TW report formatter

**Files:**
- Create: `src/Server/Services/networkReportFormatter.ts`
- Test: `test/networkReportFormatter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBottleneckReport } from "../src/Server/Services/networkReportFormatter";
import type { BottleneckFinding } from "../src/types/networkEvidence.types";

const critical: BottleneckFinding = {
  severity: "critical", target: "example.com/app.js", measuredMs: 1500, category: "slow-resource",
  diagnosis: "回應太慢。", resolution: "啟用 HTTP/2。", measured: true,
};
const infoUnmeasured: BottleneckFinding = {
  severity: "info", target: "瀑布鏈分析", measuredMs: null, category: "waterfall",
  diagnosis: "需真實瀏覽器。", resolution: "啟用 Playwright。", measured: false,
};

test("critical finding maps to error level and includes measured ms", () => {
  const lines = formatBottleneckReport([critical]);
  assert.equal(lines[0].level, "error");
  assert.match(lines[0].message, /🔴/);
  assert.match(lines[0].message, /1500ms/);
  assert.match(lines[0].message, /診斷/);
  assert.match(lines[0].message, /建議解法/);
});

test("unmeasured info finding maps to info level and omits the ms line", () => {
  const lines = formatBottleneckReport([infoUnmeasured]);
  assert.equal(lines[0].level, "info");
  assert.doesNotMatch(lines[0].message, /ms/);
});

test("emits a header line when findings exist", () => {
  const lines = formatBottleneckReport([critical]);
  assert.ok(lines.length >= 2);
  assert.match(lines[0].message, /網路瓶頸/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import tsx --test test/networkReportFormatter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { SSELogLevel } from "../../types/liveAudit.types";
import type { BottleneckFinding, BottleneckLogLine } from "../../types/networkEvidence.types";

const LEVEL: Record<BottleneckFinding["severity"], SSELogLevel> = {
  critical: "error",
  warning: "warn",
  info: "info",
};

const LABEL: Record<BottleneckFinding["severity"], string> = {
  critical: "🔴 **[嚴重瓶頸]**",
  warning: "🟡 **[警告]**",
  info: "ℹ️ **[資訊]**",
};

export function formatBottleneckReport(findings: BottleneckFinding[]): BottleneckLogLine[] {
  if (findings.length === 0) {
    return [{ level: "success", message: "網路瓶頸深度分析：未發現顯著瓶頸。" }];
  }

  const lines: BottleneckLogLine[] = [
    { level: "info", message: "── 網路瓶頸深度分析 (Network Bottleneck Deep-Dive) ──" },
  ];

  for (const f of findings) {
    const ms = f.measured && f.measuredMs !== null ? ` — 耗時 ${f.measuredMs}ms` : "";
    const message = [
      `${LABEL[f.severity]}: ${f.target}${ms}`,
      `  *診斷:* ${f.diagnosis}`,
      `  *建議解法:* ${f.resolution}`,
    ].join("\n");
    lines.push({ level: LEVEL[f.severity], message });
  }

  return lines;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --import tsx --test test/networkReportFormatter.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/Server/Services/networkReportFormatter.ts test/networkReportFormatter.test.ts
git commit -m "feat(network): zh-TW bottleneck report formatter"
```

---

## Task 5: Wire fetch-probe deep-dive into the live SSE stream

**Files:**
- Modify: `server.ts` (the `/api/scan/stream` handler, after the deterministic phase, around line 606–611)

- [ ] **Step 1: Add imports near the other Service imports at the top of `server.ts`**

```ts
import { collectNetworkProbe } from "./src/Server/Services/networkProbeCollector";
import { analyzeNetworkBottlenecks } from "./src/Server/Services/networkBottleneckAnalyzer";
import { formatBottleneckReport } from "./src/Server/Services/networkReportFormatter";
```

(Match the existing import style/paths used for other `src/Server/Services` modules in `server.ts`; adjust the relative path if the file uses a different convention.)

- [ ] **Step 2: Re-fetch the landing HTML once for the probe and stream the deep-dive**

The deterministic collector does not retain the HTML body, so fetch it once here (SSRF-guarded inside `collectNetworkProbe`'s per-resource guard does not cover the landing doc — but the deterministic pass already validated the target). Insert immediately after the `domIssueCount` block and before `sendPhase("analyzing")` (line ~607):

```ts
      // ── Network Bottleneck Deep-Dive (fetch probe) ─────────────────────
      sendLog("info", "Running network bottleneck deep-dive…");
      try {
        const htmlResponse = await fetch(finalUrl, { headers: { Accept: "text/html" } });
        const html = (htmlResponse.headers.get("content-type") ?? "").includes("text/html")
          ? await htmlResponse.text()
          : "";
        if (html) {
          const networkEvidence = await collectNetworkProbe(html, finalUrl);
          const findings = analyzeNetworkBottlenecks(networkEvidence);
          for (const line of formatBottleneckReport(findings)) {
            if (closed) return res.end();
            sendLog(line.level, line.message);
          }
          if (networkEvidence.truncated) {
            sendLog("info", `資源數超過上限，僅分析前 40 個。`);
          }
        } else {
          sendLog("warn", "無法取得 HTML 內容，略過網路瓶頸分析。");
        }
      } catch {
        sendLog("warn", "網路瓶頸分析失敗，串流繼續。");
      }
      if (closed) return res.end();
```

- [ ] **Step 3: Build to verify the server bundles (esbuild ignores the 43 pre-existing type errors)**

Run: `npm run build`
Expected: `dist/server.cjs` written, exit 0.

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat(live): stream network bottleneck deep-dive into the SSE terminal"
```

---

## Task 6: Real Playwright collector (opt-in) — CONFIRM BEFORE INSTALLING

> This task installs `playwright` + downloads Chromium (~150MB) and changes the deploy footprint. The executing agent MUST confirm with the user before running the install step. Everything above already works without it (fetch-probe is the default).

**Files:**
- Modify: `package.json` (add `playwright` to devDependencies/dependencies)
- Create: `src/Server/Services/playwrightCollector.ts`

- [ ] **Step 1: Install Playwright + Chromium (after user confirmation)**

```bash
npm install playwright
npx playwright install chromium
```
Expected: install succeeds; `npx playwright --version` prints a version.

- [ ] **Step 2: Write the collector**

```ts
import { chromium, type Request as PwRequest } from "playwright";
import { assertSafeAuditTargetUrl, isPrivateOrReservedIpAddress } from "./securityPolicies";
import type { NetworkEvidence, NetworkResource, NetworkResourceType } from "../../types/networkEvidence.types";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const NAV_TIMEOUT_MS = 20000;
const MAX_RESOURCES = 150;

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

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const notes: string[] = [];
  const resources: NetworkResource[] = [];
  let truncated = false;

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const baseOrigin = new URL(targetUrl).origin;

    await page.route("**/*", async (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.startsWith("http") && !(await isHostSafe(reqUrl))) {
        return route.abort();
      }
      return route.continue();
    });

    page.on("response", async (response) => {
      if (resources.length >= MAX_RESOURCES) { truncated = true; return; }
      const req: PwRequest = response.request();
      const timing = req.timing();
      const headers = await response.allHeaders().catch(() => ({} as Record<string, string>));
      const url = response.url();
      resources.push({
        url,
        type: mapType(req.resourceType()),
        initiator: req.redirectedFrom()?.url(),
        startMs: Math.max(0, timing.startTime),
        durationMs: Math.max(0, timing.responseEnd),
        transferBytes: headers["content-length"] ? Number(headers["content-length"]) : null,
        encodedBytes: headers["content-length"] ? Number(headers["content-length"]) : null,
        contentEncoding: headers["content-encoding"] ?? null,
        contentType: headers["content-type"] ?? null,
        isThirdParty: (() => { try { return new URL(url).origin !== baseOrigin; } catch { return false; } })(),
        renderBlocking: false,
        fromCache: false,
      });
    });

    const navResponse = await page.goto(targetUrl, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    const finalUrl = navResponse?.url() ?? targetUrl;

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
```

- [ ] **Step 3: Select the collector by mode in `server.ts`**

Replace the probe call in Task 5 Step 2's block (`const networkEvidence = await collectNetworkProbe(html, finalUrl);`) with mode selection:

```ts
          const networkEvidence = process.env.BROWSER_COLLECTOR_MODE === "playwright-real"
            ? await collectPlaywrightEvidence(finalUrl)
            : await collectNetworkProbe(html, finalUrl);
```

Add the import: `import { collectPlaywrightEvidence } from "./src/Server/Services/playwrightCollector";` and `renderBlocking` for the Playwright path stays `false` (chains/render-block inferred from initiator + page metrics; acceptable v1 — note it).

- [ ] **Step 4: Smoke test (only if Chromium installed)**

Run: `BROWSER_COLLECTOR_MODE=playwright-real node --import tsx -e "import('./src/Server/Services/playwrightCollector').then(m=>m.collectPlaywrightEvidence('https://example.com/')).then(e=>console.log(e.collector, e.resources.length)).catch(console.error)"`
Expected: prints `playwright-real <n>` with n ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/Server/Services/playwrightCollector.ts server.ts
git commit -m "feat(network): optional real Playwright collector with SSRF interceptor"
```

---

## Task 7: Full verification

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: all tests pass (synthesis + 3 new network test files + existing).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: client + `dist/server.cjs` succeed.

- [ ] **Step 3: Confirm tsc error count did not regress**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"`
Expected: 43 (unchanged baseline) unless Playwright types add resolvable issues; investigate any increase in the new files only.

---

## Self-Review notes (author)

- **Spec coverage:** types (T1) ✓; fetch probe + SSRF + render-block detection (T2) ✓; analyzer rules incl. measured:false for CPU/waterfall (T3) ✓; zh-TW formatter + level map + ms-omission (T4) ✓; SSE wiring (T5) ✓; real Playwright + SSRF interceptor + caps (T6) ✓; verification (T7) ✓.
- **No fabrication:** analyzer sets `measured:false` for third-party CPU and waterfall whenever initiator/longTasks data is absent; formatter omits the ms line when `!measured || measuredMs===null`; probe pushes honesty notes for browser-only dimensions; asserted by tests in T2/T3/T4.
- **Type consistency:** `BottleneckLogLine {level,message}` consumed by `sendLog(level,message)` in T5; `NetworkResourceType` union identical across probe (T2) and Playwright (T6); `analyzeNetworkBottlenecks`/`formatBottleneckReport` names match across tasks.
- **Heavy-action gate:** T6 install is explicitly user-confirmed; T1–T5 deliver a working, tested feature without Playwright.
```
