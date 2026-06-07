# Auditsys Health Check Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 2026-06-07 co-work health check into a sequenced remediation program that improves product honesty, release safety, harness correctness, database evolution, and maintainability.

**Architecture:** Keep the current single-process Express + Vite deployment stable while adding guardrails first, then split behavior-preserving seams around routes, audit execution, and DB schema evolution. Changes should move from low-risk verification surfaces to higher-risk architectural work.

**Tech Stack:** React 18, Vite, Tailwind, Express 5, Node native test runner with `tsx`, Drizzle ORM, Postgres/Neon, OpenRouter, Chrome UX Report.

---

## Co-Work Roles

### Product PM
- Own the user-facing truth contract: Console is a visualization/simulation layer plus real harness evidence; Live is real SSE evidence; Presentation is CrUX-grounded deck generation.
- Prioritize changes that prevent customer misunderstanding before broad feature work.
- Acceptance owner for copy, route UX, and pricing/cost trust.

### Architect
- Own boundaries: route modules, audit job lifecycle, migration strategy, and the agent platform decision.
- Prefer behavior-preserving extraction before new infrastructure.
- Decide when a planned dependency such as `drizzle-kit` is worth adding.

### Senior Dev
- Own implementation quality: SOLID boundaries, reduced duplication, typed contracts, smaller files, and reviewable diffs.
- Keep each task independently testable and reversible.
- Use TDD for behavior changes.

### QA Tester
- Own edge cases and verification: goal keyword combinations, missing API keys, failed collectors, low Lighthouse scores, DB schema drift, auth-protected routes, and stale worktree regressions.
- Expand Node tests before or alongside each behavior change.

---

## Current Baseline

Evidence gathered from the repo:
- Health-check source: `docs/2026-06-07-cowork-health-check.md`.
- Current working tree already contains P0 guardrail work: `tsconfig.json` has `strictNullChecks`, `package.json` has `typecheck`, `.github/workflows/ci.yml` runs typecheck/test/build, and `test/harness-runner.test.ts` includes extra harness regressions.
- `server.ts` still owns 20+ routes and remains the largest architectural risk.
- UI copy still heavily says "subagents" and "multi-agent" in `src/locales/en.json`, `src/locales/zh-TW.json`, `src/pages/AuditConsole.tsx`, and `src/hooks/useAuditAgent.ts`.
- Frontend cost displays still derive cost from token spend in `src/pages/AuditConsole.tsx` and `src/components/ui/DashboardWidget.tsx`; this can drift from backend model-cost truth.
- DB schema still has dual sources in `src/db/schema.ts` and raw SQL in `src/db/index.ts`.

---

## RALPLAN-DR Summary

### Principles
1. Evidence before claims: every completed step must be backed by `npm run typecheck`, `npm test`, and targeted checks.
2. Product honesty over spectacle: simulated UI must be labeled as visualization, not autonomous execution.
3. Behavior-preserving extraction first: split route and UI files only after tests lock behavior.
4. One source of truth for contracts: costs, schema, and audit state should come from backend-owned typed fields.
5. Small reversible diffs: prefer narrow slices over big-bang rewrites.

### Decision Drivers
1. Prevent regressions from worktree/HEAD drift.
2. Reduce trust risks in agent/cost claims.
3. Create enough architecture structure to safely evolve audit execution.

### Viable Options

**Option A: Guardrails-first staged remediation (recommended)**
- Pros: Highest safety, easiest to verify, aligns with current working tree.
- Cons: Large architectural items take more calendar time.

**Option B: Architecture-first rewrite**
- Pros: Could address `server.ts` and async audit jobs faster.
- Cons: High regression risk because API coverage is thin and DB migrations are not versioned.

**Option C: Product-copy-only patch**
- Pros: Very fast customer-facing improvement.
- Cons: Leaves backend cost/schema/job risks untouched.

Recommendation: Option A.

---

## Acceptance Criteria

- P0 guardrails are committed as one reviewable unit and CI can run `npm run typecheck`, `npm test`, and `npm run build`.
- Console UI visibly distinguishes simulated visualization from real harness/backend evidence in English and zh-TW.
- Harness cost shown in UI comes from backend `harness.governance.costUsd`, not an ad hoc frontend estimate.
- Any legal `goals` combination continues to return a complete report or a typed manual-review/failed state, never an undefined evidence crash.
- DB schema changes have versioned migration files or an explicit migration runner plan before any new table/column is added.
- Route extraction preserves API behavior for auth, audit, admin, scan, and presentation routes.

---

## Task 0: Freeze And Review The Current P0 Guardrail Patch

**Role owner:** Senior Dev + QA Tester

**Files:**
- Review: `package.json`
- Review: `tsconfig.json`
- Review: `.github/workflows/ci.yml`
- Review: `server.ts`
- Review: `src/Server/Services/harnessRunner.ts`
- Review: `test/harness-runner.test.ts`

- [ ] **Step 1: Review the current diff**

Run:

```powershell
git diff --stat
git diff -- .github/workflows/ci.yml package.json tsconfig.json server.ts src/Server/Services/harnessRunner.ts test/harness-runner.test.ts
```

Expected:
- `typecheck` script exists.
- `strictNullChecks` is enabled.
- CI runs typecheck/test/build.
- Harness has deterministic/browser fallback evidence.
- Harness tests cover security/content goals, memory persistence, free-model cost, and Lighthouse warning behavior.

- [ ] **Step 2: Run P0 verification**

Run:

```powershell
npm run typecheck
npm test
npm run build
```

Expected:
- Typecheck exits 0.
- Tests exit 0.
- Build exits 0. Vite warnings about chunk size or deprecated plugin options are acceptable only if there are no build errors.

- [ ] **Step 3: Code-review P0 diff before continuing**

Review focus:
- `server.ts` plan config helper must not convert valid paid-plan `allowedModels` into `undefined`.
- `harnessRunner.ts` fallback evidence must make failed deterministic collection visible to quality gates.
- Tests must restore `process.env`, `process.cwd()`, and `globalThis.fetch`.

- [ ] **Step 4: Commit P0 using Lore protocol after review**

Example commit message:

```text
Prevent health-check regressions from escaping review

Constraint: The working tree previously drifted behind HEAD and could reintroduce harness crashes.
Rejected: Relying on manual local checks only | CI must enforce typecheck, tests, and build.
Confidence: high
Scope-risk: moderate
Directive: Keep strictNullChecks enabled and add regression tests before changing harness contracts.
Tested: npm run typecheck; npm test; npm run build
Not-tested: Remote GitHub Actions execution before push
```

---

## Task 1: Make Console Product Language Honest

**Role owner:** Product PM + Senior Dev + QA Tester

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh-TW.json`
- Modify: `src/pages/AuditConsole.tsx`
- Modify: `src/hooks/useAuditAgent.ts`
- Test: `test/locale-integrity.test.ts`

- [ ] **Step 1: Write a failing locale integrity test**

Create `test/locale-integrity.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/locales/en.json" with { type: "json" };
import zh from "../src/locales/zh-TW.json" with { type: "json" };

function getPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) return undefined;
    return (value as Record<string, unknown>)[key];
  }, root);
}

test("console simulation disclosure copy exists in both locales", () => {
  for (const locale of [en, zh]) {
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.simulatedTitle"), "string");
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.simulatedBody"), "string");
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.realEvidenceTitle"), "string");
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.realEvidenceBody"), "string");
  }
});
```

Run:

```powershell
node --import tsx --test test/locale-integrity.test.ts
```

Expected before implementation:
- Fails because `auditConsole.disclosure.*` keys do not exist.

- [ ] **Step 2: Add English and zh-TW disclosure keys**

Add under `auditConsole` in both locale files:

```json
"disclosure": {
  "simulatedTitle": "Visualization layer",
  "simulatedBody": "The console animation visualizes the audit workflow. Specialist cards and tool streams are simulated UI lanes.",
  "realEvidenceTitle": "Real backend evidence",
  "realEvidenceBody": "The report, quality gate, retries, and handoff status come from the backend harness."
}
```

Use zh-TW copy:

```json
"disclosure": {
  "simulatedTitle": "流程視覺化",
  "simulatedBody": "控制台動畫用來視覺化稽核流程。專家卡片與工具串流是模擬 UI 跑道。",
  "realEvidenceTitle": "真實後端證據",
  "realEvidenceBody": "報告、品質閘、重試與人工接手狀態來自後端 harness。"
}
```

- [ ] **Step 3: Render a disclosure band in `AuditConsole.tsx`**

Place it near the console intro before the simulated subagent cards:

```tsx
<div className="grid gap-3 md:grid-cols-2">
  <div className="rounded-sm border border-[var(--border)] bg-black/5 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60">
      {t("auditConsole.disclosure.simulatedTitle")}
    </p>
    <p className="mt-2 text-sm text-brand-muted">{t("auditConsole.disclosure.simulatedBody")}</p>
  </div>
  <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
      {t("auditConsole.disclosure.realEvidenceTitle")}
    </p>
    <p className="mt-2 text-sm text-brand-muted">{t("auditConsole.disclosure.realEvidenceBody")}</p>
  </div>
</div>
```

- [ ] **Step 4: Soften simulated-agent wording**

In `src/hooks/useAuditAgent.ts`, rename internal display terms from "subagent" toward "visualization lane" where user-facing strings are generated. Keep type names unchanged for the first pass if changing `Subagent` would create a broad diff.

Acceptance:
- English and zh-TW copy no longer claims real autonomous subagent execution for the Console animation.
- Real harness panel remains labeled as backend/governance evidence.

- [ ] **Step 5: Verify**

Run:

```powershell
node --import tsx --test test/locale-integrity.test.ts
npm run typecheck
npm run build
```

---

## Task 2: Make Harness Cost Display Backend-Owned

**Role owner:** Product PM + Architect + Senior Dev + QA Tester

**Files:**
- Modify: `src/Server/Services/auditPipelineTypes.ts`
- Modify: `src/Server/Services/harnessRunner.ts`
- Modify: `src/pages/AuditConsole.tsx`
- Modify: `src/components/ui/DashboardWidget.tsx`
- Test: `test/harness-runner.test.ts`

- [ ] **Step 1: Write failing backend cost assertion**

Extend the existing free-model cost test in `test/harness-runner.test.ts`:

```ts
test("runAuditHarness exposes backend-owned zero cost for free fallback models", async () => {
  const result = await runAuditHarness(request, { allowedModels: ["google/gemini-2.5-flash:free"] }, {
    dependencies: {
      collectDeterministicEvidence: async () => makeDeterministic("completed"),
      collectBrowserEvidence: async () => makeBrowser("completed"),
      synthesizeAudit: async (_payload, evidence) => ({
        ...makeSynthesis(evidence),
        model: "google/gemini-2.5-flash:free",
      }),
    },
  });

  assert.equal(result.harness.governance.costUsd, 0);
});
```

Expected before implementation:
- Typecheck fails because `costUsd` is missing from `AuditHarnessGovernance`.

- [ ] **Step 2: Add cost to the harness contract**

In `src/Server/Services/auditPipelineTypes.ts`:

```ts
export interface AuditHarnessGovernance {
  retryCap: number;
  maxAttempts: number;
  retriesUsed: number;
  maxSteps: number;
  stepsUsed: number;
  circuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
  tokenBudget: number;
  estimatedTokenSpend: number;
  costUsd: number;
}
```

- [ ] **Step 3: Populate backend cost**

In `buildGovernance(...)` in `src/Server/Services/harnessRunner.ts`, pass `costTracker.totalCost` into governance instead of forcing UI to infer it.

Implementation shape:

```ts
function buildGovernance(
  policy: AuditHarnessPolicy,
  attempts: AuditHarnessAttempt[],
  estimatedTokenSpend: number,
  costUsd: number,
  circuitBreakerReason?: string,
): AuditHarnessGovernance {
  return {
    // existing fields
    estimatedTokenSpend,
    costUsd,
  };
}
```

Update both call sites:

```ts
buildGovernance(policy, attempts, outputTokens, costTracker.totalCost, circuitBreakerReason)
```

- [ ] **Step 4: Update UI cost cards**

In `src/pages/AuditConsole.tsx`, replace:

```ts
value: `$${(harness.governance.estimatedTokenSpend * 0.0000015).toFixed(4)}`
```

with:

```ts
value: `$${harness.governance.costUsd.toFixed(4)}`
```

In `src/components/ui/DashboardWidget.tsx`, replace ad hoc token-cost math with:

```ts
const costUsd = Number((h.governance?.costUsd ?? 0).toFixed(5));
```

- [ ] **Step 5: Verify**

Run:

```powershell
node --import tsx --test test/harness-runner.test.ts
npm run typecheck
npm test
npm run build
```

Acceptance:
- Free model runs display `$0.0000`.
- Paid model display uses backend cost math from `calculateModelCost`.
- No frontend cost formula remains for harness cards.

---

## Task 3: Decide And Tighten The Agent Platform Boundary

**Role owner:** Architect + Product PM + Senior Dev

**Files:**
- Modify: `src/Server/Services/harness/AgentOrchestrator.ts`
- Modify: `src/Server/Services/harness/AgentSandbox.ts`
- Modify: `src/Server/Services/harnessRunner.ts`
- Modify: `src/Server/Services/auditPipelineTypes.ts`
- Test: `test/harness-runner.test.ts`

- [ ] **Step 1: Choose the transitional architecture**

Decision:
- Keep the sandbox as a lightweight enforced action boundary for now.
- Stop presenting route-derived labels as "active subagents"; present them as `focusLabels` or `reviewLanes`.
- Do not remove the sandbox until all collector calls have an alternate boundary.

- [ ] **Step 2: Add a typed label field**

In `AuditHarnessRun`, add:

```ts
focusLabels?: string[];
```

Populate it from the orchestrator plan and `routeSwarm` result.

- [ ] **Step 3: Rename logging**

In `AgentOrchestrator.routeSwarm`, change the log message from:

```ts
Swarm Router Dispatched Active Subagents
```

to:

```ts
Swarm Router Suggested Focus Labels
```

- [ ] **Step 4: Add regression test for language boundary**

Add a harness test that runs a React/Node/security stack input and asserts:
- `harness.focusLabels` contains advisory labels.
- `harness.toolRegistry` still contains only real executable tools: deterministic, browser, synthesis.

- [ ] **Step 5: Verify**

Run:

```powershell
node --import tsx --test test/harness-runner.test.ts
npm run typecheck
```

Acceptance:
- Backend no longer claims advisory labels are executing agents.
- Executable tool registry remains explicit and small.

---

## Task 4: Introduce Versioned DB Migration Discipline

**Role owner:** Architect + Senior Dev + QA Tester

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `src/db/migrations/0000_initial.sql`
- Modify: `src/db/index.ts`
- Test: `test/db-migration.test.ts`

- [ ] **Step 1: Confirm dependency decision**

Architect recommendation:
- Use `drizzle-kit` if dependency installation is approved.
- If dependency installation is not approved, create a repo-local SQL migration runner first and defer `drizzle-kit`.

- [ ] **Step 2: Write migration inventory test**

Create `test/db-migration.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("initial migration covers known audit tables", async () => {
  const sql = await readFile("src/db/migrations/0000_initial.sql", "utf8");
  for (const table of [
    "audit_users",
    "audit_records",
    "audit_plan_settings",
    "audit_intake_leads",
    "agent_guardrails",
    "agent_flywheel",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
});
```

- [ ] **Step 3: Create initial SQL migration from current `initDb()` contract**

Copy the current table creation SQL from `src/db/index.ts` into `src/db/migrations/0000_initial.sql`.

- [ ] **Step 4: Keep runtime boot behavior stable**

Do not remove `initDb()` raw SQL in this task. Mark it as compatibility bootstrapping until a real migration runner is introduced.

Add a comment above the raw SQL:

```ts
// Keep this idempotent bootstrap in sync with src/db/migrations/0000_initial.sql
// until the migration runner becomes the production schema source of truth.
```

- [ ] **Step 5: Verify**

Run:

```powershell
node --import tsx --test test/db-migration.test.ts
npm run typecheck
npm test
```

Acceptance:
- Migration artifact exists and covers every current table.
- Runtime behavior does not change.
- Future schema changes have a concrete place to land.

---

## Task 5: Design Async Audit Jobs Without Rewriting The Pipeline

**Role owner:** Product PM + Architect + QA Tester

**Files:**
- Create: `docs/superpowers/specs/2026-06-07-async-audit-jobs-spec.md`
- Modify later: `src/db/schema.ts`
- Modify later: `src/db/index.ts`
- Modify later: `server.ts` or extracted `src/Server/routes/auditRoutes.ts`
- Test later: `test/audit-jobs.test.ts`

- [ ] **Step 1: Write the product spec first**

Spec must define:
- `POST /api/audit` current synchronous behavior remains available until replacement is tested.
- New proposed flow: `POST /api/audit/jobs` creates a job, `GET /api/audit/jobs/:id` polls state, optional SSE streams progress.
- Job states: `queued`, `running`, `completed`, `failed`, `manual_review`.
- Timeout behavior and user-visible retry semantics.

- [ ] **Step 2: Define acceptance criteria**

Concrete criteria:
- Job creation returns within 500ms in local tests with stubbed collectors.
- Final result shape matches current `AuditIntelligenceResult`.
- Failed collector produces typed job failure, not unhandled 500.
- Auth ownership prevents one user from reading another user's job.

- [ ] **Step 3: Defer implementation until route extraction tests exist**

Stop condition:
- Do not implement async jobs before Task 6 locks current API route behavior.

---

## Task 6: Split `server.ts` By Route Domain With Behavior Locked

**Role owner:** Architect + Senior Dev + QA Tester

**Files:**
- Create: `src/Server/routes/authRoutes.ts`
- Create: `src/Server/routes/auditRoutes.ts`
- Create: `src/Server/routes/adminRoutes.ts`
- Create: `src/Server/routes/scanRoutes.ts`
- Create: `src/Server/routes/presentationRoutes.ts`
- Modify: `server.ts`
- Test: `test/server-runtime.test.ts`
- Test: `test/security-hardening.test.ts`

- [ ] **Step 1: Add a route registration seam**

In each route module, use this shape:

```ts
import type express from "express";

export function registerAuthRoutes(app: express.Express, dependencies: AuthRouteDependencies): void {
  // Move existing auth routes here without changing route paths.
}
```

- [ ] **Step 2: Extract auth routes first**

Move only:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Keep `authenticateToken` in `server.ts` for the first extraction unless moving it creates a clearer dependency boundary.

- [ ] **Step 3: Verify after each domain extraction**

After each route-domain move, run:

```powershell
npm run typecheck
npm test
npm run build
```

- [ ] **Step 4: Continue in this order**

Order:
1. Auth routes.
2. Public plan and subscription routes.
3. Admin routes.
4. Audit/intake routes.
5. Scan routes.
6. Presentation route.

Acceptance:
- No route path changes.
- `server.ts` becomes orchestration and middleware setup, not business logic.
- Every extraction commit is independently buildable.

---

## Task 7: Clean README And Vestigial Gemini Dependency

**Role owner:** Senior Dev + QA Tester + Product PM

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `package.json`

- [ ] **Step 1: Confirm dependency is unused**

Run:

```powershell
rg -n "@google/genai|GoogleGenAI|GEMINI_API_KEY|genai" .
```

Expected:
- No application import of `@google/genai`.
- Only docs/package references remain.

- [ ] **Step 2: Update README to match AuditLens**

README must mention:
- OpenRouter, not Gemini.
- Required `JWT_SECRET`.
- Optional `DATABASE_URL`, `OPENROUTER_API_KEY`, `CRUX_API_KEY`.
- One-process dev server: `npm run dev` on port 3000.
- Test command: `npm test`.

- [ ] **Step 3: Remove vestigial dependency**

Run:

```powershell
npm uninstall @google/genai
```

Expected:
- `package.json` and `package-lock.json` update.

- [ ] **Step 4: Verify**

Run:

```powershell
npm run typecheck
npm test
npm run build
```

Acceptance:
- README no longer contradicts `AGENTS.md`.
- Build/test still pass without `@google/genai`.

---

## Task 8: Add Regression Coverage For Route And Goal Edge Cases

**Role owner:** QA Tester + Senior Dev

**Files:**
- Modify: `test/harness-runner.test.ts`
- Create: `test/audit-route-contract.test.ts`
- Modify: `server.ts` only if tests expose a bug

- [ ] **Step 1: Expand goal keyword matrix**

Add cases:

```ts
const goalCases = [
  ["security audit"],
  ["improve marketing copy"],
  ["improve seo"],
  ["security audit", "improve marketing copy", "performance"],
  [],
];
```

Each case should assert:
- deterministic collector called once per attempt.
- browser collector called once when deterministic succeeds.
- synthesis receives both deterministic and browser evidence.

- [ ] **Step 2: Add missing-key route tests with stub dependencies**

If route extraction has happened, add contract tests for:
- unauthenticated `/api/audit` returns 401.
- unsafe URL returns 400.
- valid payload with stubbed harness returns 200 and stores completed audit.

- [ ] **Step 3: Verify**

Run:

```powershell
npm test
npm run typecheck
```

Acceptance:
- Route-level failures are typed HTTP responses.
- No goal combination can skip evidence construction.

---

## Suggested Timeline

| Phase | Tasks | Owner blend | Risk |
|---|---|---|---|
| P0 Closeout | Task 0, Task 2, Task 8 goal matrix | Senior Dev + QA | Low |
| Product Honesty | Task 1, Task 3 language boundary | PM + Architect + Senior Dev | Low/Medium |
| Schema Discipline | Task 4 | Architect + QA | Medium |
| Maintainability | Task 6, Task 7 | Senior Dev + Architect | Medium |
| Larger Architecture | Task 5 async jobs | PM + Architect + QA | High |

---

## Verification Plan

Every task must end with:

```powershell
npm run typecheck
npm test
npm run build
```

Task-specific checks:
- Task 1: `node --import tsx --test test/locale-integrity.test.ts`
- Task 2: `node --import tsx --test test/harness-runner.test.ts`
- Task 4: `node --import tsx --test test/db-migration.test.ts`
- Task 6: run the full test suite after every route-domain extraction.

---

## ADR

**Decision:** Use guardrails-first staged remediation.

**Drivers:**
- Current repo already has fresh P0 changes in the working tree.
- Health-check identifies drift/regression as an immediate process risk.
- Product trust risks can be reduced without destabilizing the deployment model.

**Alternatives considered:**
- Architecture-first rewrite: rejected because route and DB coverage are not yet strong enough.
- Product-copy-only patch: rejected because backend cost/schema/job risks would remain.

**Why chosen:** It keeps the application shippable after every task and gives QA concrete regression hooks before larger refactors.

**Consequences:**
- Async job architecture waits until route contracts are safer.
- Some legacy names such as `Subagent` may remain internally for one pass while UI copy becomes honest.
- DB migration work starts with an inventory artifact before full production migration enforcement.

**Follow-ups:**
- After Task 0 and Task 2, run a formal code review on the P0 diff.
- After Task 4, decide whether to install and standardize on `drizzle-kit`.
- After Task 6, revisit async audit jobs with a smaller `server.ts` and cleaner route dependencies.

---

## Execution Handoff

Recommended execution mode:
- Use task-by-task execution.
- Keep Task 0 and Task 2 in the same short P0 branch.
- Use separate branches for Task 4 migrations, Task 6 route extraction, and Task 5 async jobs.

Agent staffing guidance if using coordinated execution:
- PM lane: Task 1 copy and acceptance criteria.
- Architect lane: Task 3, Task 4, Task 5, Task 6 boundaries.
- Senior Dev lane: Task 0, Task 2, Task 6, Task 7 implementation.
- QA lane: Task 0, Task 2, Task 4, Task 8 tests and verification.

Stop condition:
- Stop after producing passing verification evidence for the current task.
- Do not begin Task 5 implementation until Task 6 route extraction has tests and a clean build.
