# CrUX-Grounded Audit Synthesis Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject real-user CrUX field data into `auditSynthesis` and emit rich root-cause findings (`severity`/`finding`/`rootCause`/`businessImpact`/`actionableFix`) without fabricating unmeasured numbers.

**Architecture:** The orchestrator (`auditIntelligence.ts`) collects CrUX alongside the browser collector and adds it to `AuditEvidenceBundle`. `buildAuditPrompt` injects a MEASURED CrUX block + MODELED render-blocking signals and switches to an additive rich schema; `buildFallbackSummary` mirrors that schema offline. `ReportRenderer.tsx` renders the new fields, staying backward-compatible with old `{issue, impact}` audits.

**Tech Stack:** TypeScript, Express 5, React 18, existing `cruxCollector.ts` (Chrome UX Report), node `--test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-05-29-audit-synthesis-crux-upgrade-design.md`

---

## File Structure

- `src/Server/Services/auditPipelineTypes.ts` — add `crux?: CruxResult` to `AuditEvidenceBundle` (type-only import; stays isomorphic).
- `src/Server/Services/auditIntelligence.ts` — collect CrUX in parallel with browser; thread into synthesis + evidence.
- `src/Server/Services/auditSynthesis.ts` — `buildCruxLines` helper, rich-schema prompt, rich-schema `buildFallbackSummary`; export helpers for tests.
- `src/components/ui/ReportRenderer.tsx` — extend `ParsedReport`, add a reusable `FindingCard`, render `performanceFindings`, extend `SeverityBadge`.
- `test/auditSynthesis.test.ts` — new unit tests for prompt + fallback.

Note: this repo has **no React component test infra** (node `--test` + `tsx`, no jsdom/testing-library). `ReportRenderer.tsx` is verified by `npx tsc --noEmit`, not a unit test.

---

## Task 1: Add CrUX to the evidence bundle type

**Files:**
- Modify: `src/Server/Services/auditPipelineTypes.ts`

- [ ] **Step 1: Add the type-only import at the top of the file**

After the existing imports / before `export interface AuditRequestPayload`, add:

```ts
import type { CruxResult } from "../../types/liveAudit.types";
```

- [ ] **Step 2: Add the optional `crux` field to `AuditEvidenceBundle`**

Replace:

```ts
export interface AuditEvidenceBundle {
  deterministic: DeterministicCollectorResult;
  browser: BrowserCollectorResult;
}
```

with:

```ts
export interface AuditEvidenceBundle {
  deterministic: DeterministicCollectorResult;
  browser: BrowserCollectorResult;
  /** Real-user Core Web Vitals (Chrome UX Report). Absent/`hasData:false` when unavailable. */
  crux?: CruxResult;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/Server/Services/auditPipelineTypes.ts
git commit -m "feat(audit): add optional crux field to AuditEvidenceBundle"
```

---

## Task 2: Collect CrUX in the orchestrator

**Files:**
- Modify: `src/Server/Services/auditIntelligence.ts`

- [ ] **Step 1: Import the CrUX collector**

Add to the imports block:

```ts
import { fetchCruxReport } from "./cruxCollector";
```

- [ ] **Step 2: Collect CrUX in parallel with the browser collector and thread it through**

Replace:

```ts
  const deterministic = await collectDeterministicEvidence(normalizedPayload);
  const browser = await collectBrowserEvidence(normalizedPayload, deterministic);
  const synthesis = await synthesizeAudit(normalizedPayload, {
    deterministic,
    browser,
  }, config);

  return {
    ...synthesis,
    generatedAt: new Date().toISOString(),
    request: normalizedPayload,
    evidence: {
      deterministic,
      browser,
    },
  };
```

with:

```ts
  const deterministic = await collectDeterministicEvidence(normalizedPayload);
  // fetchCruxReport never throws (returns hasData:false on failure), so it is
  // safe to run in parallel with the browser collector without a try/catch.
  const [browser, crux] = await Promise.all([
    collectBrowserEvidence(normalizedPayload, deterministic),
    fetchCruxReport(normalizedPayload.url),
  ]);
  const synthesis = await synthesizeAudit(normalizedPayload, {
    deterministic,
    browser,
    crux,
  }, config);

  return {
    ...synthesis,
    generatedAt: new Date().toISOString(),
    request: normalizedPayload,
    evidence: {
      deterministic,
      browser,
      crux,
    },
  };
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/Server/Services/auditIntelligence.ts
git commit -m "feat(audit): collect CrUX field data in the audit orchestrator"
```

---

## Task 3: CrUX block + rich schema in `buildAuditPrompt`

**Files:**
- Modify: `src/Server/Services/auditSynthesis.ts`
- Test: `test/auditSynthesis.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/auditSynthesis.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AuditEvidenceBundle, AuditRequestPayload } from "../src/Server/Services/auditPipelineTypes";
import type { CruxResult } from "../src/types/liveAudit.types";
import { buildAuditPrompt, buildFallbackSummary } from "../src/Server/Services/auditSynthesis";

function baseEvidence(overrides: Partial<AuditEvidenceBundle> = {}): AuditEvidenceBundle {
  const now = new Date().toISOString();
  return {
    deterministic: {
      stage: "deterministic",
      status: "completed",
      startedAt: now,
      completedAt: now,
      targetUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      statusCode: 200,
      responseTimeMs: 1200,
      headers: { cacheControl: null, server: "nginx", poweredBy: null },
      document: {
        title: "Example",
        metaDescription: "desc",
        canonical: "https://example.com/",
        robots: null,
        lang: "en",
        viewport: "width=device-width",
        counts: {
          scripts: 18, stylesheets: 7, images: 10, imagesMissingAlt: 0,
          structuredDataBlocks: 1, headings: 5, h1: 1, internalLinks: 20,
          externalLinks: 4, openGraphTags: 3, preconnectHints: 1,
        },
      },
      notes: [],
      warnings: [],
    },
    browser: {
      stage: "browser",
      status: "completed",
      mode: "crawler",
      startedAt: now,
      completedAt: now,
      runtime: { runner: "crawler", instruction: "crawl", startUrl: "https://example.com/" },
      pages: [],
      flows: [],
      observations: [],
      warnings: [],
      screenshots: [],
      artifacts: { screenshotPaths: [], logPaths: [] },
    },
    ...overrides,
  };
}

function cruxWithData(): CruxResult {
  return {
    hasData: true,
    scope: "origin",
    collectionPeriod: "2026-04-01 → 2026-04-28",
    metrics: {
      lcp: { p75: 4200, rating: "poor" },
      inp: { p75: 180, rating: "good" },
      cls: { p75: 0.05, rating: "good" },
      fcp: { p75: 2100, rating: "needs-improvement" },
    },
    history: { lcp: { p75s: [] }, inp: { p75s: [] }, cls: { p75s: [] } },
  };
}

const enPayload: AuditRequestPayload = { url: "https://example.com/", language: "en" };

test("buildAuditPrompt includes measured CrUX values when hasData is true", () => {
  const prompt = buildAuditPrompt(enPayload, baseEvidence({ crux: cruxWithData() }));
  assert.match(prompt, /4200/);
  assert.match(prompt, /LCP/);
  assert.match(prompt, /MEASURED/);
});

test("buildAuditPrompt states no field data and omits fabricated vitals when CrUX is absent", () => {
  const prompt = buildAuditPrompt(enPayload, baseEvidence({ crux: { hasData: false, reason: "no_field_data", metrics: { lcp: { p75: null, rating: null }, inp: { p75: null, rating: null }, cls: { p75: null, rating: null }, fcp: { p75: null, rating: null } }, history: { lcp: { p75s: [] }, inp: { p75s: [] }, cls: { p75s: [] } } } }));
  assert.match(prompt, /no real-user/i);
  assert.doesNotMatch(prompt, /p75=\d/);
});

test("buildAuditPrompt instructs the rich schema with performanceFindings", () => {
  const prompt = buildAuditPrompt(enPayload, baseEvidence({ crux: cruxWithData() }));
  assert.match(prompt, /performanceFindings/);
  assert.match(prompt, /rootCause/);
  assert.match(prompt, /businessImpact/);
  assert.match(prompt, /actionableFix/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test test/auditSynthesis.test.ts`
Expected: FAIL — `buildAuditPrompt` / `buildFallbackSummary` are not exported (import error), or assertions fail.

- [ ] **Step 3: Add the `CruxResult`/`CruxMetric` import to `auditSynthesis.ts`**

Add to the top imports:

```ts
import type { CruxMetric, CruxResult } from "../../types/liveAudit.types";
```

- [ ] **Step 4: Add the `buildCruxLines` helper above `buildAuditPrompt`**

```ts
function formatCruxMetric(label: string, metric: CruxMetric, unit: "ms" | ""): string | null {
  if (metric.p75 === null) {
    return null;
  }
  return `${label}: p75=${metric.p75}${unit} rating=${metric.rating ?? "unrated"} [MEASURED, real users]`;
}

function buildCruxLines(crux?: CruxResult): string[] {
  if (!crux || !crux.hasData) {
    return [
      "Measured field data (CrUX, real users): NONE AVAILABLE.",
      "No real-user Core Web Vitals field data exists for this target. Do NOT invent or estimate numeric LCP/INP/CLS/FCP values; explicitly state that field data is unavailable.",
    ];
  }
  const scopeText = crux.scope === "origin" ? "site-wide origin" : "this page URL";
  const header = `Measured field data (CrUX, real users) — scope: ${scopeText}${crux.collectionPeriod ? `, collection period: ${crux.collectionPeriod}` : ""}. Treat these as MEASURED ground truth:`;
  return [
    header,
    formatCruxMetric("LCP (largest contentful paint)", crux.metrics.lcp, "ms"),
    formatCruxMetric("INP (interaction to next paint)", crux.metrics.inp, "ms"),
    formatCruxMetric("CLS (cumulative layout shift)", crux.metrics.cls, ""),
    formatCruxMetric("FCP (first contentful paint)", crux.metrics.fcp, "ms"),
  ].filter((line): line is string => Boolean(line));
}
```

- [ ] **Step 5: Export and update `buildAuditPrompt`**

Change the function signature from `function buildAuditPrompt(` to `export function buildAuditPrompt(`.

Replace the schema-instruction block (the lines from `"You MUST output your response as a valid JSON object..."` through the closing `"}",` and the `"Keep the tone consultative..."` line) with:

```ts
    "You MUST output your response as a valid JSON object matching the following structure EXACTLY. DO NOT wrap the output in markdown code blocks (e.g., no ```json). Output ONLY the raw JSON object.",
    "Every finding object MUST include: severity ('critical' | 'warning' | 'info'), finding (one professional sentence), rootCause (technical why), businessImpact (e.g. effect on conversion/retention), actionableFix (precise step-by-step developer instruction).",
    "{",
    `  "executiveSummary": "A concise, professional overview of the site's health and readiness for C-level stakeholders.",`,
    '  "performanceFindings": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "deterministicFindings": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "browserFlowGaps": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "architectureRisks": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "nextActions": [{ "action": "Clear actionable step", "impact": "Expected improvement", "actionableFix": "Precise developer instruction" }]',
    "}",
    "ANALYSIS RULES:",
    "- Treat CrUX values as measured ground truth. When no field data is available, say so and do NOT output numeric Core Web Vitals.",
    "- Infer LCP/INP root cause ONLY from the MODELED inputs supplied (server response time/TTFB, render-blocking stylesheet/script counts, crawled route timings). You have NO per-request waterfall and NO LCP-element attribution — never claim a specific element or HTTP request caused a vital.",
    "- Tag every modeled or estimated figure explicitly (zh-TW: 估算 or 模型推估; en: 'estimated').",
    "- Use performanceFindings for Core Web Vitals / latency; keep deterministicFindings, browserFlowGaps, architectureRisks for their respective concerns.",
    "Keep the tone consultative, professional, and actionable. Frame technical issues in terms of business impact.",
```

- [ ] **Step 6: Insert the CrUX + modeled-signal lines into the evidence section of the prompt**

In the returned array, immediately after `buildEvidenceLines(payload, evidence.deterministic).join("\n"),` add:

```ts
    buildCruxLines(evidence.crux).join("\n"),
    `MODELED inputs for performance root-cause (not per-asset measurements): TTFB=${evidence.deterministic.responseTimeMs ?? "unknown"}ms, stylesheets=${evidence.deterministic.document?.counts.stylesheets ?? 0}, scripts=${evidence.deterministic.document?.counts.scripts ?? 0}, preconnectHints=${evidence.deterministic.document?.counts.preconnectHints ?? 0}.`,
    evidence.browser.pages.length > 0
      ? `Crawled route timings: ${evidence.browser.pages.map((page) => `${page.url} — ${page.notes.join("; ")}`).join(" | ")}`
      : null,
```

- [ ] **Step 7: Run the prompt tests to verify they pass**

Run: `node --import tsx --test test/auditSynthesis.test.ts`
Expected: the three `buildAuditPrompt` tests PASS. (Fallback tests are added in Task 4.)

- [ ] **Step 8: Commit**

```bash
git add src/Server/Services/auditSynthesis.ts test/auditSynthesis.test.ts
git commit -m "feat(audit): inject CrUX field data and rich schema into synthesis prompt"
```

---

## Task 4: Rich-schema `buildFallbackSummary` with measured-only performance findings

**Files:**
- Modify: `src/Server/Services/auditSynthesis.ts`
- Test: `test/auditSynthesis.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `test/auditSynthesis.test.ts`:

```ts
test("buildFallbackSummary emits valid JSON with the rich schema arrays", () => {
  const json = buildFallbackSummary(enPayload, baseEvidence({ crux: cruxWithData() }), "test");
  const parsed = JSON.parse(json);
  assert.ok(typeof parsed.executiveSummary === "string");
  assert.ok(Array.isArray(parsed.performanceFindings));
  assert.ok(Array.isArray(parsed.deterministicFindings));
  assert.ok(Array.isArray(parsed.nextActions));
});

test("buildFallbackSummary uses measured CrUX p75 and tags modeled inferences (zh-TW)", () => {
  const zhPayload: AuditRequestPayload = { url: "https://example.com/", language: "zh-TW" };
  const json = buildFallbackSummary(zhPayload, baseEvidence({ crux: cruxWithData() }), "test");
  const parsed = JSON.parse(json);
  const lcp = parsed.performanceFindings.find((f: { finding: string }) => f.finding.includes("4200"));
  assert.ok(lcp, "expected an LCP finding carrying the measured p75");
  assert.equal(lcp.severity, "critical"); // poor rating → critical
  assert.match(JSON.stringify(parsed.performanceFindings), /估算|模型推估/);
});

test("buildFallbackSummary does NOT emit numeric vitals when CrUX is absent", () => {
  const json = buildFallbackSummary(enPayload, baseEvidence(), "test");
  const parsed = JSON.parse(json);
  assert.equal(parsed.performanceFindings.length, 1);
  assert.equal(parsed.performanceFindings[0].severity, "info");
  assert.match(parsed.performanceFindings[0].finding, /no real-user|field data/i);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import tsx --test test/auditSynthesis.test.ts`
Expected: FAIL — `performanceFindings` is undefined / not an array.

- [ ] **Step 3: Add the rich-finding type and helpers above `buildFallbackSummary`**

```ts
interface RichFinding {
  severity: "critical" | "warning" | "info";
  finding: string;
  rootCause: string;
  businessImpact: string;
  actionableFix: string;
}

function severityFromRating(rating: CruxResult["metrics"]["lcp"]["rating"]): "critical" | "warning" | "info" {
  if (rating === "poor") return "critical";
  if (rating === "needs-improvement") return "warning";
  return "info";
}

function buildPerformanceFindings(evidence: AuditEvidenceBundle, isZh: boolean): RichFinding[] {
  const crux = evidence.crux;
  const det = evidence.deterministic;

  if (!crux || !crux.hasData) {
    return [
      {
        severity: "info",
        finding: isZh
          ? "無真實使用者欄位資料 (CrUX)，本次未量測核心網頁指標 (Core Web Vitals)。"
          : "No real-user field data (CrUX) available; Core Web Vitals were not measured this run.",
        rootCause: isZh
          ? "目標流量不足或 CRUX_API_KEY 未設定，Chrome UX Report 無資料可回傳。"
          : "Target lacks sufficient traffic or CRUX_API_KEY is unset, so the Chrome UX Report returned no field data.",
        businessImpact: isZh
          ? "無法以實測數據佐證效能對轉換率的影響。"
          : "Performance-to-conversion impact cannot be evidenced with measured data.",
        actionableFix: isZh
          ? "設定 CRUX_API_KEY，或改用實驗室量測（PageSpeed/Lighthouse）取得效能數據。"
          : "Configure CRUX_API_KEY, or use a lab measurement (PageSpeed/Lighthouse) to obtain performance data.",
      },
    ];
  }

  const ttfb = det.responseTimeMs ?? null;
  const stylesheets = det.document?.counts.stylesheets ?? 0;
  const scripts = det.document?.counts.scripts ?? 0;
  const modeledZh = `（根因為模型推估，非逐項量測）`;
  const modeledEn = `(root cause is modeled, not per-asset measured)`;

  const configs: Array<{
    key: "lcp" | "inp" | "cls";
    unit: string;
    nameZh: string;
    nameEn: string;
    rootZh: string;
    rootEn: string;
    fixZh: string;
    fixEn: string;
    bizZh: string;
    bizEn: string;
  }> = [
    {
      key: "lcp",
      unit: "ms",
      nameZh: "最大內容繪製 (LCP)",
      nameEn: "Largest Contentful Paint (LCP)",
      rootZh: `初始 HTML 回應時間 ${ttfb ?? "未知"}ms 與 ${stylesheets} 個樣式表、${scripts} 個指令碼為可能的渲染阻塞來源 ${modeledZh}。`,
      rootEn: `Server response time ${ttfb ?? "unknown"}ms plus ${stylesheets} stylesheets / ${scripts} scripts are likely render-blocking contributors ${modeledEn}.`,
      fixZh: "壓縮並預先載入 (preload) 首屏圖片、為渲染阻塞樣式表內聯關鍵 CSS、延後非關鍵指令碼。",
      fixEn: "Compress and preload the hero image, inline critical CSS for render-blocking stylesheets, and defer non-critical scripts.",
      bizZh: "LCP 偏高會降低首屏體驗與轉換率（影響程度為估算）。",
      bizEn: "High LCP degrades above-the-fold experience and conversion (impact is estimated).",
    },
    {
      key: "inp",
      unit: "ms",
      nameZh: "互動到下次繪製 (INP)",
      nameEn: "Interaction to Next Paint (INP)",
      rootZh: `主執行緒上的 JavaScript 執行量偏高（${scripts} 個指令碼）可能延遲互動回應 ${modeledZh}。`,
      rootEn: `Heavy main-thread JavaScript (${scripts} scripts) likely delays interaction responsiveness ${modeledEn}.`,
      fixZh: "拆分長任務、延後第三方指令碼、減少 hydration 成本。",
      fixEn: "Break up long tasks, defer third-party scripts, and reduce hydration cost.",
      bizZh: "INP 偏高會讓互動感覺遲鈍，降低使用者完成關鍵動作的比率（影響程度為估算）。",
      bizEn: "High INP makes interactions feel sluggish, lowering completion of key actions (impact is estimated).",
    },
    {
      key: "cls",
      unit: "",
      nameZh: "累計版面位移 (CLS)",
      nameEn: "Cumulative Layout Shift (CLS)",
      rootZh: `無尺寸保留的圖片或晚載入字型可能造成版面位移 ${modeledZh}。`,
      rootEn: `Images without reserved dimensions or late-loading fonts can cause layout shift ${modeledEn}.`,
      fixZh: "為圖片與廣告容器設定明確尺寸、使用 font-display: optional/swap 並預先載入字型。",
      fixEn: "Set explicit dimensions on images/ad slots and use font-display: optional/swap with preloaded fonts.",
      bizZh: "CLS 偏高會造成誤點與挫折感，傷害信任與轉換（影響程度為估算）。",
      bizEn: "High CLS causes misclicks and frustration, harming trust and conversion (impact is estimated).",
    },
  ];

  const findings: RichFinding[] = [];
  for (const config of configs) {
    const metric = crux.metrics[config.key];
    if (metric.p75 === null) {
      continue;
    }
    findings.push({
      severity: severityFromRating(metric.rating),
      finding: isZh
        ? `${config.nameZh} 實測 p75 為 ${metric.p75}${config.unit}（評級：${metric.rating ?? "無資料"}）。`
        : `${config.nameEn} measured p75 is ${metric.p75}${config.unit} (rating: ${metric.rating ?? "no data"}).`,
      rootCause: isZh ? config.rootZh : config.rootEn,
      businessImpact: isZh ? config.bizZh : config.bizEn,
      actionableFix: isZh ? config.fixZh : config.fixEn,
    });
  }
  return findings;
}
```

- [ ] **Step 4: Wire `performanceFindings` into the `buildFallbackSummary` return and enrich existing findings**

In `buildFallbackSummary`, locate the final `return JSON.stringify({ ... });`. Replace it with:

```ts
  const performanceFindings = buildPerformanceFindings(evidence, isZh);

  return JSON.stringify({
    executiveSummary,
    performanceFindings,
    deterministicFindings: findings.map((f) => ({
      severity: "warning" as const,
      finding: f,
      rootCause: isZh ? "由靜態收集證據推得，尚未經瀏覽器執行驗證。" : "Derived from deterministic evidence; not yet verified by browser execution.",
      businessImpact: isZh ? "需進一步調查以量化影響。" : "Requires further investigation to quantify impact.",
      actionableFix: isZh ? "啟用瀏覽器收集器以取得執行期證據後再行確認。" : "Enable the browser collector to confirm with runtime evidence.",
      issue: f,
      impact: isZh ? "需要進一步調查" : "Requires further investigation",
    })),
    browserFlowGaps,
    architectureRisks,
    nextActions: nextActions.map((a) => ({
      action: a,
      impact: isZh ? "提升整體管道的可見度與穩定度。" : "Improves overall pipeline visibility and stability.",
      actionableFix: a,
    })),
  });
```

(Note: `browserFlowGaps` and `architectureRisks` already carry `issue`/`impact`/`severity`; the renderer falls back to those, so they need no change here. Their `severity` strings remain `low`/`medium`/`high` and are mapped by the renderer in Task 5.)

- [ ] **Step 5: Run the full synthesis test file**

Run: `node --import tsx --test test/auditSynthesis.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/Server/Services/auditSynthesis.ts test/auditSynthesis.test.ts
git commit -m "feat(audit): rich-schema fallback with measured-only CrUX performance findings"
```

---

## Task 5: Render the rich schema in `ReportRenderer.tsx`

**Files:**
- Modify: `src/components/ui/ReportRenderer.tsx`

- [ ] **Step 1: Extend the `ParsedReport` and finding interfaces**

Replace:

```ts
interface ParsedReport {
  executiveSummary?: string;
  deterministicFindings?: { issue: string; impact: string; severity?: string }[];
  browserFlowGaps?: { issue: string; impact: string; severity?: string }[];
  architectureRisks?: { issue: string; impact: string; severity?: string }[];
  nextActions?: { action: string; impact: string }[];
}
```

with:

```ts
interface RichFinding {
  // Rich schema (new):
  severity?: string;
  finding?: string;
  rootCause?: string;
  businessImpact?: string;
  actionableFix?: string;
  // Legacy schema (old stored audits):
  issue?: string;
  impact?: string;
}

interface ParsedReport {
  executiveSummary?: string;
  performanceFindings?: RichFinding[];
  deterministicFindings?: RichFinding[];
  browserFlowGaps?: RichFinding[];
  architectureRisks?: RichFinding[];
  nextActions?: { action: string; impact?: string; actionableFix?: string }[];
}
```

- [ ] **Step 2: Extend `SeverityBadge` to map the new enum and the legacy enum**

Replace the body of `SeverityBadge` with:

```ts
  const SeverityBadge = ({ severity }: { severity?: string }) => {
    if (!severity) return null;
    const s = severity.toLowerCase();
    if (s === "critical" || s === "high") return <span className="rounded-md bg-semantic-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-danger border border-semantic-danger/30">{isZh ? "嚴重" : "Critical"}</span>;
    if (s === "warning" || s === "medium") return <span className="rounded-md bg-semantic-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-warning border border-semantic-warning/30">{isZh ? "警告" : "Warning"}</span>;
    return <span className="rounded-md bg-semantic-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-success border border-semantic-success/30">{isZh ? "資訊" : "Info"}</span>;
  };
```

- [ ] **Step 3: Add a reusable `FindingCard` inside the component (above the `return`)**

```ts
  const FindingCard = ({ item }: { item: RichFinding }) => {
    const title = item.finding ?? item.issue ?? "";
    const impact = item.businessImpact ?? item.impact ?? "";
    return (
      <div className="rounded-2xl bg-white/[0.02] p-4 border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
        <div className="flex justify-between items-start mb-2 gap-2">
          <p className="text-sm font-semibold text-white leading-snug">{title}</p>
          <SeverityBadge severity={item.severity} />
        </div>
        {item.rootCause && (
          <p className="text-xs text-white/50 leading-relaxed mb-1">
            <span className="font-semibold text-white/70">{isZh ? "根因：" : "Root cause: "}</span>{item.rootCause}
          </p>
        )}
        {impact && <p className="text-xs text-white/60 leading-relaxed">{impact}</p>}
        {item.actionableFix && (
          <p className="mt-2 text-xs text-brand-cyan/80 leading-relaxed">
            <span className="font-semibold">{isZh ? "建議解法：" : "Fix: "}</span>{item.actionableFix}
          </p>
        )}
      </div>
    );
  };
```

- [ ] **Step 4: Add the Performance card and convert the three finding sections to `FindingCard`**

Add `Gauge` to the lucide import line:

```ts
import { LayoutDashboard, Zap, Target, ShieldAlert, Flag, ChevronDown, Gauge } from "lucide-react";
```

Immediately after the `executiveSummary` block and before `<div className="flex flex-col gap-6">`, add the performance section, then replace the three existing finding sections' inner `.map(...)` markup with `<FindingCard item={item} />`. The full replacement for the `<div className="flex flex-col gap-6">…</div>` block:

```tsx
      <div className="flex flex-col gap-6">
        {parsed.performanceFindings && parsed.performanceFindings.length > 0 && (
          <CollapsibleCard
            title={isZh ? "效能與核心網頁指標" : "Performance & Core Web Vitals"}
            icon={<Gauge className="h-5 w-5 text-brand-cyan" />}
            colorClass="text-brand-cyan"
            borderColorClass="border-brand-cyan/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.performanceFindings.map((item, i) => <FindingCard key={i} item={item} />)}
            </div>
          </CollapsibleCard>
        )}

        {parsed.deterministicFindings && parsed.deterministicFindings.length > 0 && (
          <CollapsibleCard
            title={isZh ? "技術發現" : "Technical Findings"}
            icon={<Zap className="h-5 w-5 text-brand-purple" />}
            colorClass="text-brand-purple"
            borderColorClass="border-brand-purple/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.deterministicFindings.map((item, i) => <FindingCard key={i} item={item} />)}
            </div>
          </CollapsibleCard>
        )}

        {parsed.browserFlowGaps && parsed.browserFlowGaps.length > 0 && (
          <CollapsibleCard
            title={isZh ? "流程驗證 (Browser evidence)" : "Flow Verification"}
            icon={<Target className="h-5 w-5 text-semantic-success" />}
            colorClass="text-semantic-success"
            borderColorClass="border-semantic-success/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.browserFlowGaps.map((item, i) => <FindingCard key={i} item={item} />)}
            </div>
          </CollapsibleCard>
        )}

        {parsed.architectureRisks && parsed.architectureRisks.length > 0 && (
          <CollapsibleCard
            title={isZh ? "架構風險 (Architecture Lens)" : "Architecture Risks"}
            icon={<ShieldAlert className="h-5 w-5 text-semantic-danger" />}
            colorClass="text-semantic-danger"
            borderColorClass="border-semantic-danger/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.architectureRisks.map((item, i) => <FindingCard key={i} item={item} />)}
            </div>
          </CollapsibleCard>
        )}

        {parsed.nextActions && parsed.nextActions.length > 0 && (
          <CollapsibleCard
            title={isZh ? "後續建議行動 (Action)" : "Strategic Next Steps"}
            icon={<Flag className="h-5 w-5 text-semantic-warning" />}
            colorClass="text-semantic-warning"
            borderColorClass="border-semantic-warning/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.nextActions.map((item, i) => (
                <div key={i} className="flex gap-4 rounded-2xl bg-white/[0.02] p-4 border border-semantic-warning/10 hover:bg-white/[0.04] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-semantic-warning/20 text-semantic-warning font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug">{item.action}</p>
                    {item.impact && <p className="mt-1 text-xs text-white/60 leading-relaxed">{item.impact}</p>}
                    {item.actionableFix && item.actionableFix !== item.action && (
                      <p className="mt-1 text-xs text-brand-cyan/80 leading-relaxed">{item.actionableFix}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        )}
      </div>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/ReportRenderer.tsx
git commit -m "feat(report): render rich findings + performance card, backward-compatible"
```

---

## Task 6: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all tests pass (existing `security-hardening` + new `auditSynthesis`).

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build to confirm bundling still works**

Run: `npm run build`
Expected: client + server bundle succeed.

- [ ] **Step 4: Commit any incidental fixes (only if needed)**

```bash
git add -A
git commit -m "chore(audit): verification fixes for CrUX synthesis upgrade"
```

---

## Self-Review notes (author)

- **Spec coverage:** orchestrator CrUX (Task 2) ✓; type (Task 1) ✓; prompt MEASURED/MODELED blocks + rich schema (Task 3) ✓; fallback measured-only performance findings + honesty tags (Task 4) ✓; renderer rich fields + performance card + dual severity mapping (Task 5) ✓; tests (Tasks 3–4) ✓; out-of-scope `reportViewModel.ts`/Lighthouse untouched ✓.
- **No fabrication:** fallback emits numeric vitals ONLY from `crux.metrics[*].p75`; absent CrUX → single info finding, asserted by test in Task 4 Step 1.
- **Type consistency:** `RichFinding` shape identical across `auditSynthesis.ts` (Task 4) and `ReportRenderer.tsx` (Task 5, plus legacy `issue`/`impact`); `severityFromRating` returns the same `critical|warning|info` union the renderer maps.
