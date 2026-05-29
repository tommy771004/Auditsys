# Audit Synthesis Upgrade: CrUX-Grounded Root-Cause Reports

**Date:** 2026-05-29
**Status:** Approved (design), pending spec review
**Scope:** Backend `auditSynthesis` pipeline + report renderer. Lighthouse collector explicitly out of scope.

## Problem

`auditSynthesis` today produces a shallow report. Its prompt is fed only deterministic HTTP evidence (`responseTimeMs`, asset counts, meta tags) plus browser-crawler notes. It emits findings shaped `{ issue, impact, severity }` and never sees real-user performance data.

The product goal is a *synthesized*, root-cause-driven audit: each finding should explain **why** a bottleneck happens, translate it to **business impact**, and give a **concrete fix**. Core Web Vitals (LCP/INP/CLS) should be measured, not modeled, wherever real-user data exists.

`cruxCollector.ts` already fetches real-user Core Web Vitals from the Chrome UX Report, but it is only wired to the presentation route and the live CWV card — it never reaches `auditSynthesis`.

## Honesty constraint (non-negotiable)

The user requires real measured data; estimates must be labeled, never silently fabricated.

What CrUX provides: real-user p75 + rating + 6-month history for LCP, INP, CLS, FCP, at page (`url`) scope with `origin` fallback.

What CrUX does **not** provide, and what therefore must **never** be invented:
- LCP element attribution ("the hero image at X delayed LCP").
- Per-request network waterfall timing or byte sizes.
- Main-thread / JS-execution breakdown.

The deterministic collector and crawler give only: TTFB (`responseTimeMs`), counts of scripts/stylesheets/images, preconnect hints, and per-route response timing for up to 3 crawled routes. These are **modeled inputs** for inferring root cause, not measurements of the vitals themselves.

The synthesis must: treat CrUX values as measured ground truth; when CrUX has no field data, say so rather than guess; infer root cause only from the supplied deterministic/crawler signals; and tag any modeled figure (`估算` / `模型推估` in zh-TW, "estimated" in en).

## Decisions (from brainstorming)

1. **Schema migration: additive + backward-compatible.** New rich fields are added alongside the existing `issue`/`impact`. Old audits stored in Postgres continue to render.
2. **Language: keep bilingual.** The rich schema and root-cause framework apply to both `en` and `zh-TW`. zh-TW uses Taiwanese terminology (最大內容繪製 / 渲染阻塞 / 伺服器 / 封包).
3. **Approach A** chosen over a separate performance LLM pass (2× cost/failure) or pure deterministic templating (loses synthesis quality).

## Architecture

### Data flow

```
generateAuditIntelligence(payload)
  → assertSafeAuditTargetUrl
  → collectDeterministicEvidence            (existing)
  → Promise.all([
       collectBrowserEvidence,              (existing)
       fetchCruxReport(url),                (NEW — never throws)
    ])
  → synthesizeAudit(payload, { deterministic, browser, crux }, config)
  → result.evidence = { deterministic, browser, crux }
```

`fetchCruxReport` returns `hasData:false` on any failure (missing key, no field data, network error), so it is safe to call unconditionally and never blocks the pipeline.

### Components

**1. `auditPipelineTypes.ts`**
- Add `crux?: CruxResult` to `AuditEvidenceBundle` (type-only import from `src/types/liveAudit.types`; keeps the shared module isomorphic — no Node imports).

**2. `auditIntelligence.ts`**
- Collect CrUX (parallel with browser via `Promise.all`), add to the synthesis call and the returned `evidence` bundle.

**3. `auditSynthesis.ts` — `buildAuditPrompt`**
Add three evidence blocks:
- **Measured field data (CrUX, real users)** — LCP/INP/CLS/FCP p75 + rating + scope (`url`|`origin`) + collection period. Emitted only when `crux.hasData`; otherwise an explicit "No real-user field data available" line. Labeled MEASURED.
- **Render-blocking & weight signals** — `responseTimeMs` (TTFB), stylesheets, scripts, preconnectHints. Labeled MODELED inputs.
- **Crawled route timings** — parsed from browser pages/notes.

New output schema (strict JSON, both languages):
```jsonc
{
  "executiveSummary": "...",
  "performanceFindings": [
    { "severity": "critical|warning|info",
      "finding": "1-sentence professional description",
      "rootCause": "technical why",
      "businessImpact": "e.g. conversion-rate impact",
      "actionableFix": "step-by-step developer instruction" }
  ],
  "deterministicFindings": [ { ...same rich shape, plus legacy "issue"/"impact" optional } ],
  "browserFlowGaps":       [ { ...same rich shape } ],
  "architectureRisks":     [ { ...same rich shape } ],
  "nextActions": [ { "action": "...", "impact": "...", "actionableFix": "..." } ]
}
```

Severity enum is `critical | warning | info`.

Prompt hard rules: CrUX = ground truth; no field data → state unavailability; infer root cause only from supplied signals; **never** invent element-level or waterfall attribution; tag modeled figures (`估算`/`模型推估`); zh-TW uses Taiwanese terms.

**4. `auditSynthesis.ts` — `buildFallbackSummary`**
- Emit the same rich schema.
- Populate `performanceFindings` from CrUX when `hasData`, tagging modeled inferences; when no CrUX, emit a single "field data unavailable" performance finding rather than fabricated vitals.
- Existing deterministic/browser fallback findings gain the rich fields (`finding`/`rootCause`/`businessImpact`/`actionableFix`).

**5. `ReportRenderer.tsx`**
- Extend `ParsedReport`: add `performanceFindings`; add optional `finding`, `rootCause`, `businessImpact`, `actionableFix` to the finding type.
- Render `finding ?? issue` and `businessImpact ?? impact`; add `rootCause` and `actionableFix` blocks when present (backward compatible with old `{issue, impact}` audits).
- Add a Performance card (e.g. `Gauge`/`Activity` icon) for `performanceFindings`.
- Extend `SeverityBadge` to map `critical|warning|info` (danger/warning/success) **and** legacy `high|medium|low`.

### Out of scope
- Lighthouse / PageSpeed lab collector (separate future decision).
- `reportViewModel.ts` / `SampleReport.tsx` (demo page, text-line consumption — unaffected by additive JSON change).
- DB migrations (none needed; `audits.result` is a JSON string).

## Testing

Add `test/auditSynthesis.test.ts` (node `--test` via `tsx`, per repo convention):
- CrUX metrics appear in the prompt string when `crux.hasData` is true.
- When `crux.hasData` is false, the prompt contains the explicit "no field data" line and no fabricated vitals.
- `buildFallbackSummary` returns valid JSON with the rich schema and the new arrays.
- Fallback tags modeled figures (`估算`/`模型推估`) in zh-TW and does not emit numeric vitals when CrUX is absent.

## Risks / mitigations
- **LLM ignores schema** → existing JSON-only instruction retained; renderer already falls back to raw text on parse failure.
- **Old stored audits** → additive schema + `??` fallbacks in renderer keep them rendering.
- **CrUX latency** → 8s timeout already in collector; parallelized with browser; non-blocking on failure.
