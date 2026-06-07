# AuditSys Health Diagnostic Report

## Executive Summary

**Overall Health Score: 7/10**

The AuditSys application benefits from a solid foundation leveraging Express 5, React 18, and Drizzle ORM, with a well-structured domain focusing on website performance auditing. The recent architectural split of `server.ts` into isolated route modules, along with essential security hardening (IPv6 SSRF protection, strict password requirements), has elevated the backend's maintainability. However, the system currently suffers from type-safety gaps at the API boundary, an unorthodox approach to database migrations, and product inconsistencies between the three disparate audit entry points. By addressing the Quick Wins and adopting the recommended architectural patterns, AuditSys can graduate from a stable MVP to an enterprise-grade platform.

---

## Findings Table

| ID | Category | Severity | Path / Component | Description |
|---|---|---|---|---|
| R1-1 | Code Logic | High | `src/Server/Routes/*` | Use of `(req as any).user` bypasses TypeScript's type safety for authenticated requests. |
| R1-2 | Code Logic | Medium | `src/Server/Routes/auditRoutes.ts` | Missing `try/catch` or Zod validation when parsing `audits.result` JSON from the database. |
| R1-3 | Code Logic | Medium | `src/Server/Services/openrouterHelper.ts` | Potential missing timeout and circuit breaker for 500s from OpenRouter. |
| R1-4 | Code Logic | Low | `src/Server/Middleware/errorMiddleware.ts` | Inconsistent error payload structure (some endpoints return raw strings, others JSON). |
| R1-5 | Code Logic | Low | `src/db/adminBootstrap.ts` | Admin bootstrap logic relies on env vars dynamically rather than a strict initialization phase lock. |
| R2-1 | Architecture | High | `src/db/index.ts` | Ad-hoc `CREATE TABLE IF NOT EXISTS` is used instead of declarative Drizzle migration files. |
| R2-2 | Architecture | Medium | `src/types/` | Server-side pipeline types are imported directly by frontend hooks, blurring boundaries. |
| R2-3 | Architecture | Medium | `server.ts` | Vite middleware mode in the same Express process tightly couples dev environments and slows down HMR. |
| R2-4 | Architecture | Medium | `src/Server/Routes/authRoutes.ts` | Mixes authentication/user management and billing/planSettings CRUD. |
| R2-5 | Architecture | Low | `test/` | Missing integration tests mapping the full audit pipeline with mocked network requests (e.g., Nock/MSW). |
| R3-1 | Product Coherence | High | `src/Server/Routes/` | `/api/audit`, `/api/intake`, and `/api/audit/presentation` duplicate plan settings and security logic. |
| R3-2 | Product Coherence | Medium | UI Console | Simulated subagent theater in Console masks the real backend pipeline execution state from the user. |
| R3-3 | Product Coherence | Low | `src/locales/` | `payload.language === "zh-TW"` in backend is hardcoded and may fall out of sync with frontend i18n locale switcher. |

---

## Detailed Sections

### 1. Code Logic Audit (R1)

**Findings & Root Cause Analysis:**
*   **Type-safety gaps on `req.user` (R1-1):** Casting `(req as any).user` is prevalent across route handlers (`auditRoutes.ts`, `presentationRoutes.ts`, `scanRoutes.ts`). This nullifies TypeScript's ability to ensure the `user` object has the expected fields (like `id`, `subscriptionPlan`), potentially causing silent runtime errors if the token payload structure changes.
*   **Unsafe JSON Parsing (R1-2):** `JSON.parse(a.result)` in `userAuditsRouter` lacks a `try/catch` block. If malformed data somehow enters the PostgreSQL `result` column, fetching the audit history will throw an unhandled exception, causing a 500 Internal Server Error for the entire history page.
*   **OpenRouter Reliability (R1-3):** While 401/403/429 are handled, the system needs a strict timeout limit and a circuit breaker for generic 5xx errors from the LLM provider to avoid hanging the Express server threads indefinitely.
*   **Error Middleware Formatting (R1-4):** Error responses sometimes return `{ error: message }` and sometimes just throw. A consistent `{ error: { code, message, details } }` API contract is missing.

**Prioritised Recommendations:**
1.  Extend the Express `Request` interface via a global `d.ts` declaration to explicitly type `req.user`, completely removing the `(req as any).user` casts.
2.  Wrap `JSON.parse` operations in a utility function with a `try/catch` and a fallback object, or use Zod to validate the shape of the database JSON blobs upon retrieval.

### 2. Architecture & Design Quality Review (R2)

**Findings & Root Cause Analysis:**
*   **No DB Migrations (R2-1):** Relying on raw `CREATE TABLE IF NOT EXISTS` means schema alterations (adding/modifying columns) will not apply to existing tables. This is highly risky for a production environment.
*   **Type Sharing (R2-2):** Frontend hooks importing directly from `src/Server/Services/auditPipelineTypes.ts` creates a tight coupling. If a server file accidentally imports a Node-only module (like `fs`), the frontend build will break.
*   **Monolithic Dev Server (R2-3):** Serving Vite as Express middleware on the same port is convenient but limits scalability. It inflates the memory footprint of the Node process and makes backend restarts slower.

**Prioritised Recommendations:**
1.  Implement `drizzle-kit` for proper migration generation and execution (`npm run db:generate` / `npm run db:push`).
2.  Extract shared types to a dedicated `src/shared/types/` directory that contains zero implementation logic and can safely be imported by both frontend and backend.
3.  Split the development servers: run Vite on port 5173 and Express on port 3000, using Vite's built-in `server.proxy` to route `/api` calls to the backend.

### 3. Product & Feature Coherence Review (R3)

**Findings & Root Cause Analysis:**
*   **Fragmented Entry Points (R3-1):** The application has three distinct ways to trigger an audit (`audit`, `intake`, `presentation`). This leads to duplicated logic for fetching the user's plan, parsing subscription rules, and checking SSRF.
*   **Misleading Console UI (R3-2):** The "mock simulated multi-subagent UI" in the console displays fake timers and fake tool calls while waiting for the real backend pipeline to return. This creates a disconnect between what the user sees and what the system is actually doing, which can erode trust if the timing feels artificially inflated.
*   **Hardcoded i18n Logic (R3-3):** The backend relies on `payload.language === "zh-TW"` to toggle Chinese outputs for the LLM. If the frontend adds `zh-CN` or `ja`, the backend will silently fall back to English or break unless manually updated.

**Prioritised Recommendations:**
1.  Consolidate the setup logic (URL validation, Plan/Quota checks, Evidence collection) into a single reusable service layer that all three endpoints invoke.
2.  Transition the Console UI from fake subagent theater to a real-time SSE stream (similar to the Live Dashboard) that emits actual pipeline progression events.

---

## Quick Wins

The following high-ROI tasks can be completed in under 30 minutes each:

1.  **Strict Type `req.user`:** Create an `express.d.ts` file extending `Express.Request` to include `user: JwtPayload`, and remove all `(req as any)` casts.
    *   *Effort:* 15 mins
    *   *Impact:* Eliminates potential runtime crashes from undefined user properties.
2.  **Safe JSON Parsing:** Create a `safeJsonParse` helper that catches syntax errors and returns a null/default object, and apply it to `auditRoutes.ts`.
    *   *Effort:* 10 mins
    *   *Impact:* Prevents 500 errors on the history page if a database row contains corrupted JSON.
3.  **Extract Shared Types:** Move `auditPipelineTypes.ts` to `src/shared/` and update import paths across the frontend and backend.
    *   *Effort:* 20 mins
    *   *Impact:* Prevents accidental Node.js dependency leakage into the React client bundle.
4.  **Consolidate Plan Lookups:** Create a shared middleware `requirePlanLimits` that fetches `getPlanSettingsWithCache`, attaching `req.auditConfig` so routes don't repeat the DB lookup.
    *   *Effort:* 25 mins
    *   *Impact:* Reduces code duplication across the three audit entry points.
5.  **Global API Error Formatting:** Update `errorMiddleware.ts` to always return `{ error: { code: string, message: string } }` and map frontend interceptors to this structure.
    *   *Effort:* 20 mins
    *   *Impact:* Standardises error handling across the entire SPA, improving user feedback.
