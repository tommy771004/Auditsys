# Network Bottleneck Deep-Dive (Live Terminal)

**Date:** 2026-05-29
**Status:** Approved (design), pending spec review
**Branch:** `feature/audit-synthesis-crux-upgrade` (shared with the CrUX synthesis spec; separate feature)
**Scope:** New network evidence collection layer (real Playwright + fetch probe), a bottleneck analyzer, and a zh-TW "Network Bottleneck Deep-Dive" report streamed into the live `ExecutionTerminal`.

## Problem

The live scan (`/api/scan/stream` → `ExecutionTerminal.tsx`) streams `SSELog` frames but has no per-resource network analysis. The product goal is a network reliability deep-dive that flags latency anti-patterns:

1. Waterfall chains (sequential requests that should parallelize).
2. Render-blocking assets (head CSS / synchronous JS delaying FCP).
3. Uncompressed / unoptimized payloads (missing gzip/brotli; images not WebP/AVIF).
4. Third-party bloat (tracking/ads/tag-managers consuming main-thread time).

The output is a zh-TW markdown report (Taiwanese Mandarin) streamed into the Liquid Glass terminal.

## Honesty constraint (non-negotiable)

The user requires real measured data; estimates must be labeled, never fabricated. `ExecutionTerminal.tsx` already documents that it "never fabricates log data."

**Physical limits of a `fetch`-based collector** (current `playwright` mode is a fake fetch-crawler, not a real browser):
- **Main-thread CPU time** — requires JS execution + long-task profiling. Unmeasurable by `fetch`.
- **True waterfall chains (A→B→C via JS)** — requires initiator chains from a real browser. `fetch` sees only static HTML-declared resources, which load in parallel anyway.

Decision (`都要一起做`): build **both** a real Playwright collector (delivers all four directives) **and** a fetch sub-resource probe (honest fallback when Playwright is unavailable). Any metric the active collector cannot measure is emitted as an explicit `需真實瀏覽器量測，本次未測量` note — never a synthesized number.

## Architecture

Three layers, built in order. Each layer is independently testable.

### Layer 1 — Network evidence collection

**Shared isomorphic types** (`src/types/networkEvidence.types.ts`; no Node imports):
```ts
interface NetworkResource {
  url: string;
  type: "document" | "script" | "stylesheet" | "image" | "font" | "fetch" | "media" | "other";
  initiator?: string;          // requesting URL (Playwright only)
  startMs: number;             // relative to navigation start
  durationMs: number;          // measured response/load time
  transferBytes: number | null;
  encodedBytes: number | null;
  contentEncoding: string | null;   // gzip | br | null
  contentType: string | null;
  isThirdParty: boolean;
  renderBlocking: boolean;     // head + sync (CSS, or script without async/defer)
  fromCache: boolean;
}
interface NetworkPageMetrics {
  fcpMs: number | null;        // Playwright only
  lcpMs: number | null;        // Playwright only
  longTasksMs: number | null;  // total main-thread long-task time, Playwright only
  mainThreadBusyMs: number | null; // Playwright only
}
interface NetworkEvidence {
  collector: "playwright-real" | "fetch-probe";
  finalUrl: string;
  resources: NetworkResource[];
  page: NetworkPageMetrics;
  truncated: boolean;          // hit resource cap
  notes: string[];             // honesty labels for unmeasured dimensions
}
```

**`src/Server/Services/playwrightCollector.ts`** (real):
- Launch headless Chromium (Playwright). New `BROWSER_COLLECTOR_MODE=playwright-real`.
- SSRF-guarded navigation: the target URL passes `assertSafeAuditTargetUrl`. For in-page sub-requests, reuse a request interceptor that blocks private/reserved IP destinations (see Security) while allowing legitimate public third-party hosts.
- Capture per-request via `page.on("response")` + CDP `Network`/`Performance`: timing, transfer/encoded bytes, `content-encoding`, `content-type`, initiator chain, fromCache.
- Capture FCP/LCP via `PerformanceObserver` (paint + largest-contentful-paint), long-task total via `PerformanceObserver("longtask")`.
- Hard caps: navigation timeout (e.g. 20s), max resources (e.g. 150 → set `truncated`), max total wall time.

**`src/Server/Services/networkProbeCollector.ts`** (fetch fallback):
- Parse landing HTML for sub-resources: `<script src>` (+ async/defer + head/body position), `<link rel=stylesheet>` (head), `<img src>`, `<link rel=preload/preconnect>`, fonts.
- SSRF-guarded, bounded-concurrency fetch of each sub-resource (cap N, e.g. 40 → `truncated`); measure `durationMs`, read `content-encoding`/`content-length`/`content-type`; compute byte length when no `content-length`.
- `renderBlocking` derived from position + async/defer. `initiator`, `fcpMs`, `lcpMs`, `longTasksMs`, `mainThreadBusyMs` left `null`; push honesty notes.

**Collector selection:** orchestrated by mode. `playwright-real` → `playwrightCollector`; otherwise `networkProbeCollector` (enrichment that runs even in crawler mode). Both never throw to the caller (return best-effort evidence + notes).

### Layer 2 — Bottleneck analyzer

**`src/Server/Services/networkBottleneckAnalyzer.ts`** — pure function `analyzeNetworkBottlenecks(evidence: NetworkEvidence): BottleneckFinding[]`.

```ts
interface BottleneckFinding {
  severity: "critical" | "warning" | "info";
  target: string;            // file/API/host
  measuredMs: number | null; // only when measured
  category: "waterfall" | "render-blocking" | "uncompressed" | "image-format" | "third-party" | "slow-resource";
  diagnosis: string;         // zh-TW
  resolution: string;        // zh-TW
  measured: boolean;
}
```

Rules (thresholds tunable, defined as named constants):
- **slow-resource**: `durationMs` over critical/warning thresholds.
- **render-blocking**: `renderBlocking === true` head CSS/sync JS.
- **uncompressed**: text/css/js/json/svg with `contentEncoding === null` over a size threshold.
- **image-format**: `image/jpeg|png|gif` over a size threshold (suggest WebP/AVIF).
- **third-party**: by transfer size always; by CPU only when `page.longTasksMs`/initiator attribution exists (Playwright). Otherwise a finding with `measured:false` noting CPU was not profiled.
- **waterfall**: derive sequential initiator chains from `initiator` (Playwright only); fetch-probe emits an `info` `measured:false` note that chain detection needs a browser.

Analyzer emits `measured:false` info findings for any dimension the evidence lacks — never invents a number.

### Layer 3 — zh-TW report + SSE streaming

**`src/Server/Services/networkReportFormatter.ts`** — `formatBottleneckReport(findings, lang): SSELog[]`.
- zh-TW markdown per spec:
  - `🔴 **[嚴重瓶頸]**: {target} — 耗時 {measuredMs}ms` (omit "耗時" line when `measured:false`)
    - `*診斷:* {diagnosis}`
    - `*建議解法:* {resolution}`
  - `🟡 **[警告]**: …`
  - `ℹ️` info / unmeasured: `需真實瀏覽器量測，本次未測量`.
- Taiwanese terms: 封包, 渲染阻塞, 多工 (parallelize), 預先載入 (preload), 伺服器, 壓縮.
- Level mapping: critical→`error`, warning→`warn`, info→`info`.

**Wire into `/api/scan/stream`** (`server.ts`): after the existing deterministic phase, run the network collector + analyzer, stream the formatter's `SSELog` frames before the `done` event. Failures degrade to a single info frame; the stream still closes cleanly.

## Security (Playwright SSRF)

A headless browser makes arbitrary in-page requests, which is a fresh SSRF surface beyond the existing `assertSafeAuditTargetUrl` (which only guards the top-level target).
- Top-level navigation target still passes `assertSafeAuditTargetUrl`.
- Install a Playwright request interceptor (`page.route`) that resolves each in-page request host and **aborts** requests to private/reserved/loopback IPs, while allowing public third-party hosts (needed for real third-party analysis).
- Enforce navigation + total time caps and a max-resource cap to bound resource abuse.
- Run Chromium with a restrictive sandbox profile; no downloads; no file:// or non-http(s) schemes.

## Out of scope
- The CrUX synthesis spec (separate, already designed).
- Persisting network evidence to Postgres (live-stream only for now).
- CI provisioning of the Chromium binary (deployment task; noted as a follow-up).

## Testing
Per repo convention (node `--test` via `tsx`, files under `test/`):
- `networkProbeCollector`: parses sub-resources, sets `renderBlocking` from head/async/defer, leaves browser-only fields `null` + adds notes (use a local HTML fixture; no live network).
- `networkBottleneckAnalyzer`: each rule fires on crafted `NetworkEvidence`; emits `measured:false` info findings when dimensions are absent; never produces a number without a measurement.
- `networkReportFormatter`: zh-TW format matches spec; omits the ms line when `measured:false`; correct level mapping.
- Playwright collector: smoke test gated/skipped when the browser binary is unavailable (kept out of the default suite).

## Risks / mitigations
- **Playwright + Chromium binary** size on Windows/deploy → document install; keep fetch-probe as the default so the feature degrades without the browser.
- **Scan latency** → caps + run after deterministic phase; stream incrementally.
- **Browser SSRF** → request interceptor blocking private IPs (above).
- **Flaky long-task/LCP capture** → treat as best-effort; `null` + note when unavailable.

## Build order
1. Layer 1 types + `networkProbeCollector` (fetch, no deps) + tests.
2. Layer 1 `playwrightCollector` + SSRF interceptor + caps.
3. Layer 2 analyzer + tests.
4. Layer 3 formatter + tests, then wire into `/api/scan/stream`.
