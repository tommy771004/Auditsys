# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install            # install dependencies
npm run dev            # start dev server: Express on :3000 with Vite in middleware mode (SPA + API on one port)
npm run build          # vite build (client) + esbuild bundle server.ts -> dist/server.cjs
npm start              # run production bundle: node dist/server.cjs (expects NODE_ENV=production)
npm run preview        # vite preview only

npm test                                   # node --test over test/**/*.test.ts (see note below)
node --import tsx --test test/foo.test.ts  # run a single test file
```

Notes:
- Tests run on the native Node test runner via `tsx`, not Vitest/Jest. Current coverage: `test/security-hardening.test.ts` (JWT-secret fail-closed, admin bootstrap, SSRF/private-IP guards, plan parsing, deterministic collector) and `test/harness-runner.test.ts` (retry cap, quality-gate pass/manual-review, governance counters — uses `runAuditHarness`'s injectable `dependencies` to stub the three collectors). Add new `*.test.ts` files under `test/`.
- `check.ts` (repo root) is a throwaway DB-inspection script (`tsx check.ts`) — dumps `plan_settings` + `users`, not part of the test suite.
- `README.md` is stale Google AI Studio boilerplate (says `GEMINI_API_KEY`); ignore it — the app uses **OpenRouter**, not Gemini directly. The `@google/genai` dependency is vestigial. Trust this file over `README.md`.
- There is no lint or typecheck script. `tsconfig.json` uses `noEmit` (type info only); run `npx tsc --noEmit` manually if you need type checking.
- Dev and prod both serve the SPA and API from the **same Express process on port 3000** — there is no separate frontend dev server. In dev, Vite runs as Express middleware (`server.ts`); in prod, Express serves `dist/`.

## Required environment

Set these in `.env.local` (see `.env.example`):
- `DATABASE_URL` — Neon/Postgres connection string. Without it, the server boots but all DB-backed routes return 500; `initDb()` is skipped.
- `JWT_SECRET` — **required at startup**; `getRequiredJwtSecret()` throws if missing.
- `OPENROUTER_API_KEY` — optional; when absent, audit synthesis falls back to a deterministic, templated report instead of an LLM call.
- `CRUX_API_KEY` — optional, **server-side** Chrome UX Report key powering `/api/scan/crux` (real-user Core Web Vitals + history). When absent or the target has no field data, the live card falls back to a PageSpeed lab run.
- `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` — optional; if both set (password ≥ 12 chars), an admin user is seeded on `initDb()`.
- Browser collector: `BROWSER_COLLECTOR_MODE` (`stub` | `playwright` | `webwright`, default `playwright`) plus `WEBWRIGHT_*` artifact paths (see Browser collector below).

Frontend build-time vars (Vite `import.meta.env.*`, optional — all have safe same-origin/fallback defaults):
- `VITE_API_URL` — backend base URL for the live dashboard's `EventSource`/`fetch`; empty keeps requests same-origin.
- `VITE_AUDIT_ENDPOINT` / `VITE_INTAKE_ENDPOINT` — override the console/intake POST targets (otherwise `/api/audit`, `/api/intake`).
- `VITE_PAGESPEED_API_KEY` — Google PageSpeed Insights key for `CoreWebVitalsCard`; works without it but is rate-limited.

## Architecture

This is a single-process TypeScript app: a React 18 SPA (Vite, Tailwind, framer-motion, i18next) served by an Express 5 backend, backed by Postgres via Drizzle ORM. The product ("AuditLens") generates AI-assisted website audit reports.

### Backend (`server.ts` + `src/Server/Services/` + `src/db/`)
- **`server.ts`** is the entire HTTP layer: auth (JWT in httpOnly cookie *and* Bearer header), user/audit/admin/plan CRUD, and the two audit entry points `POST /api/audit` and `POST /api/intake`. Both create a `pending` audit row, run the pipeline, then update the row to `completed`/`failed`. Error messages like `UNSAFE_AUDIT_TARGET`, `INVALID_AUDIT_PAYLOAD`, `AUDIT_TARGET_REDIRECT_LIMIT` are mapped to HTTP 400 vs 502. A third generator, `POST /api/audit/presentation`, produces a 5-slide zh-TW audit *deck* (score + slides) via a direct OpenRouter call — separate from the pipeline below. It is **CrUX-grounded**: it first runs the SSRF guard + collects real measurements (`fetchCruxReport` real-user CWV + a `collectDeterministicEvidence` HTTP probe) for the target, injects them into the prompt, and returns a `measuredEvidence` block so the UI can label measured (CrUX) vs modeled numbers. The deterministic fallback (`generateSmartPresentationFallback`) uses the real CWV when present and tags every unmeasured figure as `估算`/`模型推估`.
- **Per-plan LLM config (DB-driven):** before each LLM call, the audit/intake/presentation routes look up the caller's `subscriptionPlan`, load that plan's row from `audit_plan_settings`, and pass `{ openRouterApiKey, allowedModels }` into the generator. The DB `openrouter_api_key` column **overrides** env `OPENROUTER_API_KEY`; `allowed_models` (CSV) restricts model choice for paid plans (free plans pass `undefined` → fall back to the hard-coded free-model list). Admins edit these via `PATCH /api/admin/plan-settings/:planId`.
- **`src/db/`** — Drizzle schema (`schema.ts`, tables prefixed `audit_*`) and `index.ts`. There are **no Drizzle migration files**; `initDb()` runs idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... IF NOT EXISTS` SQL directly and seeds default `plan_settings` (free/pro/enterprise). Schema changes must be made in **both** `schema.ts` and the raw SQL in `index.ts`. `adminBootstrap.ts` (`resolveAdminBootstrapConfig`) parses/validates the `BOOTSTRAP_ADMIN_*` env (throws if password < 12 chars) and is consumed by `initDb()`.

### Audit pipeline (`src/Server/Services/`)
`generateAuditIntelligence()` (`auditIntelligence.ts`) is thin: it normalizes the payload, runs `assertSafeAuditTargetUrl`, then delegates to **`runAuditHarness()`** (`harnessRunner.ts`) and returns `{ ...synthesis, evidence, harness }`. The harness is the real orchestrator — it wraps the three evidence stages in a retry/governance loop and attaches an `AuditHarnessRun` (status, attempts, quality-gate checks, governance counters, pivots, retrospective) to the result that the `console` UI renders.

The three stages, each a typed result in `auditPipelineTypes.ts`:
1. **`securityPolicies.assertSafeAuditTargetUrl`** — SSRF guard run before any fetch: rejects non-http(s), credentialed URLs, blocked hostnames, and private/reserved IPs (resolves DNS and checks every address). Also home of subscription-plan logic.
2. **`deterministicCollector`** — server-side HTTP fetch + HTML parse (titles, meta, link/image/asset counts).
3. **`browserCollector`** — produces `BrowserCollectorResult` evidence in one of three modes (see below).
4. **`auditSynthesis`** — builds a strict-JSON LLM prompt from the evidence bundle and calls **`openrouterHelper.fetchOpenRouterWithFallback`**, which iterates a hard-coded list of OpenRouter free models (paid only when `ALLOW_PAID_FALLBACK=true`), handling 401/403 (stop), 429 (next model), 404 (skip). If no API key or all models fail, `buildFallbackSummary` returns a templated report. The prompt and fallback are **bilingual**: `payload.language === "zh-TW"` switches output to Taiwanese-term Traditional Chinese.

### Audit harness (`harnessRunner.ts` + `src/Server/Services/harness/`)
`runAuditHarness(payload, config, options)` runs up to `maxAttempts` (3) attempts. Each attempt: an `AgentOrchestrator` rule-routes the goals into a step plan (`deterministic` always, `browser`+`synthesis` added by keyword/default), the three collectors run through it, then `buildSensors`→`buildQualityGate` grade the result into `passed` / `manual_review` (warnings) / `failed`. Only a **`failed`** gate retries, bounded by `retryCap` (2 retries → `pivots`); `manual_review` and `passed` stop immediately. A step-budget + `CostTracker` token budget act as a circuit breaker. The final `AuditHarnessRun` carries `handoffRequired`/`handoffReason` and a markdown `retrospective`.
- **The `harness/` classes are a lightweight in-process "agent-platform" layer, much of it illustrative** (heavy `console.log`, no external services): `AgentIdentity`/`CredentialsVault` (per-attempt identity), `AgentSandbox`+`ActionInterceptor` (blocks file/non-allowlisted-network actions, runs a middleware chain around each call), `ObservabilityTelemetry` (`ExecutionTracer`, `CostTracker`, `calculateModelCost`), `ContextManager` (head/tail truncation past an 80k-char threshold), `SkillManager` (lazy skill registry), `GuardrailKnowledgeBase` (records failure reasons to bias the next attempt), `FlywheelCollector` (per-run metrics sink). The **load-bearing** behavior is the retry cap, quality gate, circuit breaker, and cost budget — the identity/sandbox/flywheel scaffolding is wired in but mostly demonstrative.
- `runAuditHarness`'s third arg `options.dependencies` lets tests inject stub collectors and `options.policy` overrides the budgets — this is how `test/harness-runner.test.ts` exercises the retry/gate logic without network.

### Browser collector modes
`BROWSER_COLLECTOR_MODE` selects behavior:
- **`playwright`** (default env value) — *not real Playwright*; a lightweight `fetch`-based crawler (`buildCrawlerResult`) that GETs the landing doc, extracts internal `<a>` links, then GETs up to 3 internal routes capturing per-route status/timing/title, and aggregates average-response and timing flows. Route status/timing are embedded in `page.notes` strings, which `liveScanCollector` parses back out via regex for the live summary. **It honestly reports its own `mode`/`runner` as `"crawler"`** (the `playwright` env token only selects this code path; it never claims to be a headless browser and never produces screenshots).
- **`webwright`** — reads pre-generated artifacts (`report.json`, `task.json`, `trajectory.json`, screenshots, logs) discovered via `WEBWRIGHT_WORKSPACE_DIR` / `WEBWRIGHT_*_PATH` env vars, normalized through `webwrightContract.ts`. Sample artifacts live in `fixtures/webwright/sample-run/`.
- **`stub`** — scaffolded `not_run` placeholder evidence.

### Frontend (`src/`)
- Routing is **hash-based** via `useHashRoute` + a `switch` in `App.tsx` (no router library). Routes: home, console, live, pricing, report, intake, login, admin, campaign, presentation.
- **Three audit experiences exist and differ fundamentally.** `presentation` (`AuditPresentation.tsx` + `src/types/presentation.ts`) is a slide-deck view of the `POST /api/audit/presentation` output; `console` and `live` differ as below:
  - `console` (`AuditConsole` + `useAuditAgent`) — a **mock/simulated** multi-subagent agent UI (timers, fake tool calls), which then overlays the **real** report once `/api/audit` returns. When the result carries a `harness` object, it also renders a real governance panel (status pill, est-cost/latency/attempts/pivots stats, quality-gate checks, handoff banner) and a retrospective modal — i.e. the simulated agent theater is fake, the harness summary beside it is real backend data.
  - `live` (`RealAuditDashboard` + `useRealTimeAudit`) — a **real** SSE-driven scan. `GET /api/scan/stream` (auth via `?token=` query, since `EventSource` can't set headers) runs `collectDeterministicEvidence` once and emits `SSELog` frames + `phase`/`fail`/`done` events; the `done` frame carries a structured `LiveScanSummary` (scores, asset breakdown, SEO signals, crawled routes) rendered as charts by `ScanSummaryPanel`. `GET /api/scan/dom-issues` returns `LiveDOMIssue[]` with HTML snippets. Backend logic lives in `src/Server/Services/liveScanCollector.ts`. For Core Web Vitals, `CoreWebVitalsCard` is **field-data-first**: it calls `GET /api/scan/crux` (backend `cruxCollector.ts` → Chrome UX Report `queryRecord` + `queryHistoryRecord`, page-`url` scope then `origin` fallback) to show real-user LCP/INP/CLS with good/needs-improvement/poor ratings and history sparklines (`CwvSparkline`); when CrUX returns `hasData:false` it falls back to a direct-from-browser Google PageSpeed **lab** run (`VITE_PAGESPEED_API_KEY`).
- `services/auditApi.ts` posts to the API with a `data:` URL fallback to demo payloads when the real request fails (so the UI degrades gracefully offline).
- i18n: `en` and `zh-TW` locales in `src/locales/`; the selected language is sent in the audit payload to drive report language.
- UI is a custom "Liquid Glass" design system in `src/components/ui/` (GlassCard, GlowingButton, MeshBackground, etc.); design intent is documented in `liquid_glass_architecture/` and `DESIGN_CRITIQUE.md`.

### Key conventions
- `audits.result` and intake `goals`/`stack` are stored as **JSON strings** in Postgres; always `JSON.parse`/`JSON.stringify` at the boundary (server routes already do this).
- Server-side services live under `src/Server/Services/` but their types (e.g. `auditPipelineTypes.ts`) are imported directly by frontend hooks — keep these isomorphic (no Node-only imports in type-shared files).
- Marketing/design artifacts (`docs/`, `*.md` briefs, `_1`–`_4/`, `liquid_glass_architecture/`) are reference material, not application code.
