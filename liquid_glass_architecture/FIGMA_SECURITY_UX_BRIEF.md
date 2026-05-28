# AuditLens Security UX Brief for Figma

## Purpose

Translate the newly enforced backend security posture into first-class product states that feel intentional inside the existing Liquid Glass system, not like generic errors dropped into a premium flow.

This brief is the Figma-ready handoff for the next design pass. The Figma MCP surface was not callable in this session, so the deliverable here is a build-ready spec aligned to the current repo and the existing design language in [FIGMA_SPECS.md](D:\Project\github\Auditsys\FIGMA_SPECS.md:1), [DESIGN_CRITIQUE.md](D:\Project\github\Auditsys\DESIGN_CRITIQUE.md:1), and [liquid_glass_architecture/DESIGN.md](D:\Project\github\Auditsys\liquid_glass_architecture\DESIGN.md:1).

## Product Goals

- Make blocked plan upgrades feel governed and reviewable, not broken.
- Make unsafe audit target rejection happen as an intelligible preflight gate.
- Give admins a compact security operations view for config and approval health.
- Reuse the current Liquid Glass tokens instead of introducing a separate “security theme.”

## Source Screens to Mirror

- Pricing flow in [src/pages/Pricing.tsx](D:\Project\github\Auditsys\src\pages\Pricing.tsx:43)
- Intake wizard in [src/pages/Intake.tsx](D:\Project\github\Auditsys\src\pages\Intake.tsx:391)
- Audit Console in [src/pages/AuditConsole.tsx](D:\Project\github\Auditsys\src\pages\AuditConsole.tsx:515)
- Admin dashboard in [src/pages/Admin.tsx](D:\Project\github\Auditsys\src\pages\Admin.tsx:12)

## Figma Page Structure

1. `00 Foundations`
   - Existing color, type, spacing, blur, and glow tokens
   - New semantic status tokens listed below

2. `10 Security States`
   - Error and approval components
   - URL safety validation states
   - Admin security summary cards

3. `20 Pricing Approval Flow`
   - Self-serve downgrade
   - Approval-required upgrade
   - Success redirect state

4. `30 Intake & Audit Guardrails`
   - Clean URL entry
   - Unsafe target rejection
   - Redirect-limit rejection
   - Preflight pass into run state

5. `40 Admin Security Ops`
   - Security overview tab
   - Config health cards
   - Approval queue state

## New Component Work

### `SecurityStatusBanner`

- Use for top-of-flow messages in Pricing, Intake, and Audit Console.
- Variants:
  - `info`
  - `warning`
  - `critical`
  - `approval-required`
  - `success`
- Layout:
  - horizontal auto layout
  - 16px gap
  - icon + message stack + optional CTA
  - min height 56px
- Styling:
  - glass base, 1px border
  - accent ring/glow tied to state color
  - no fully opaque fill

### `TargetSafetyChecklist`

- Inline panel under the target URL field.
- Rows:
  - protocol allowed
  - hostname allowed
  - resolved network safe
  - redirect chain safe
- Each row should support `idle`, `checking`, `pass`, and `fail`.
- Use concise operational copy, not generic marketing phrasing.

### `SecurityGateCard`

- A larger card for Audit Console preflight.
- Shows:
  - target host
  - policy result
  - rejection reason
  - next safe action
- This becomes the visual bridge between “Submit URL” and “Scan is running.”

### `PolicyPill`

- Small capsule tags used in Admin and Audit Console.
- Variants:
  - `jwt-required`
  - `bootstrap-enabled`
  - `approval-needed`
  - `unsafe-target-blocked`
  - `redirect-guard`

### `AdminSecuritySummaryCard`

- Compact dashboard card for:
  - JWT secret configured
  - bootstrap admin enabled/disabled
  - target egress guard active
  - pending plan approvals

## Screen-Level Direction

### Pricing: Approval-Required Upgrade State

Problem:
Current pricing UX only shows a generic message string after a `403`.

Figma output:
- Keep the plan cards, but add a persistent approval-required state when the selected plan needs admin action.
- On click for blocked upgrades:
  - selected card receives a soft violet outline
  - `SecurityStatusBanner` appears above the pricing grid
  - optional secondary CTA: `Contact admin`
- Copy shape:
  - headline: “Upgrade requires approval”
  - body: explain that billing-tier elevation is managed by an admin

### Intake: Unsafe Target Rejection

Problem:
The backend now rejects unsafe URLs, but the current flow has no differentiated preflight state.

Figma output:
- Add `TargetSafetyChecklist` directly below the URL input.
- Add an inline critical state for:
  - loopback/private address
  - `.local` / `.internal`
  - unsupported protocol
- Keep the wizard layout unchanged; this is a refinement, not a redesign.

### Audit Console: Security Gate Before Run

Problem:
The console currently emphasizes parallel-agent theater, but there is no visible ingress safety checkpoint.

Figma output:
- Add `SecurityGateCard` above the mission stream area.
- On submit:
  - first state: `Validating target`
  - then either `Gate passed` or a blocked state
- If blocked, do not blend it into the report panel; isolate it as a first-order state.

### Admin: Security Operations Slice

Problem:
Admins can manage users and plans, but cannot see the posture of the new controls.

Figma output:
- Add a `Security` tab or overview module.
- Include four summary cards:
  - JWT secret
  - bootstrap admin mode
  - audit target policy
  - plan approval queue
- Add one simple table/list for pending upgrade approvals if product chooses to implement that workflow next.

## Semantic Token Additions

Keep these mapped onto existing brand colors instead of introducing new hues.

- `security-info`: cyan
- `security-warning`: blue-violet
- `security-critical`: rose
- `security-success`: cyan-green tint derived from current palette
- `security-neutral`: white/55 over dark glass

## Motion & Interaction Notes

- Validation rows should animate with subtle opacity and position shifts, 180-220ms.
- Approval banners should fade and lift in, not scale aggressively.
- Blocked states should use stronger border definition before stronger glow.
- Focus states should follow the critique guidance: offset rings integrated into the glass edge, not harsh default outlines.

## Accessibility Notes

- Every security state needs icon + text, never color alone.
- Inline URL validation copy must remain visible without hover.
- Preserve 44x44 minimum targets for any retry, edit, or escalation CTA.
- Error and approval banners should sit in DOM order immediately after the triggering control.

## Handoff Notes for the Figma Pass

- Reuse `GlassCard`, `GlowingButton`, and current typography ramps before inventing new base primitives.
- New work should feel like an extension of the current system, with the “organic interaction” improvements called out in [DESIGN_CRITIQUE.md](D:\Project\github\Auditsys\DESIGN_CRITIQUE.md:1).
- Prioritize these frames first:
  - Pricing approval-required
  - Intake unsafe URL
  - Audit Console preflight blocked
  - Admin security overview

## Definition of Done

- The four priority frames exist in desktop and mobile variants.
- Each frame has explicit idle, loading, success, and failure states where applicable.
- New security components are instance-based and token-driven.
- Engineering can map each frame directly back to the listed source files without inventing behavior.
