# Product Requirements Document: AuditLens

## 1. Product Identity & Vision
**AuditLens** is an AI-assisted Website Auditor built on top of a proprietary "Agent Harness Platform".
- **The Core Product** is the Website Auditor (AuditLens), providing deep SEO, performance, and security insights.
- **The Technical Enabler** is the Agent Harness Platform, which orchestrates deterministic collectors, headless browsers, and LLMs in a resilient, circuit-broken pipeline.

This PRD unifies the product identity: we are selling the *Auditor* to the end-user, while the *Agent Harness* is our underlying infrastructure that makes the Auditor uniquely powerful.

## 2. User Personas
1. **SEO/Performance Agency Owner**: Needs fast, accurate, white-labeled presentation decks to pitch to prospective clients. Focuses on the `/api/audit/presentation` flow.
2. **Technical SEO Specialist**: Needs deep technical details, DOM issues, and real-user metrics (CrUX). Focuses on the `/api/scan/stream` live dashboard and detailed evidence.
3. **Internal Product Admin**: Configures the agent harness policies, token budgets, and allowed LLM models via `/api/admin/plan-settings/:planId`.

## 3. Core Entry Points & Acceptance Criteria

### 3.1. Background Audit Pipeline (`/api/audit`)
**Purpose**: Run the full, multi-stage agentic audit pipeline (Deterministic -> Browser -> LLM Synthesis) without blocking the HTTP request.
**Acceptance Criteria**:
- API responds immediately with `202 Accepted` and `{ queued: true }`.
- Background worker (BullMQ) processes the audit safely within token and cost budgets.
- Target URLs are validated against SSRF and private-IP restrictions before any network request.
- Results are saved to the `audit_records` table upon completion or failure.

### 3.2. Intake Lead Generation (`/api/intake`)
**Purpose**: Collect lead information (email, website) and run a lightweight audit pipeline to generate a "teaser" report.
**Acceptance Criteria**:
- Similar architecture to `/api/audit` but gated by specific lead-generation LLM prompts.
- Submissions trigger a background job to prevent frontend timeouts.

### 3.3. Presentation Deck Generator (`/api/audit/presentation`)
**Purpose**: Generate a 5-slide Executive Pitch Deck (zh-TW by default) comparing current metrics against best practices, grounded in CrUX field data.
**Acceptance Criteria**:
- SSRF guard validates the target URL.
- Fetches real-user CWV metrics via Chrome UX Report API (or falls back to PageSpeed lab data).
- Generates structured JSON output for the presentation UI without running the full Agent Harness orchestrator (to minimize latency).

## 4. Non-Functional Requirements
- **High Availability**: Audit requests must be queued. Traffic spikes must not crash the Express server.
- **Security**: The Agent Sandbox must strictly block access to local files and reserved/private IP spaces.
- **Resiliency**: The harness must automatically retry failed LLM syntheses or blocked browser crawls up to the configured `retryCap`.
- **Cost Control**: Every run must track its token usage. The `CostTracker` circuit breaker must trip and abort the run if the `costBudgetUsd` is exceeded.
