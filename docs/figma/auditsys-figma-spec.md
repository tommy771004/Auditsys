# Auditsys Figma 規格

目的：將現有 Auditsys React/Tailwind 頁面與元件轉成可在 Figma 建立的 design system、component variants 與 screen frames。  
來源：`src/pages/Home.tsx`、`src/pages/AuditConsole.tsx`、`src/pages/RealAuditDashboard.tsx`、`src/components/ui/*`、`src/components/live/*`、`tailwind.config.ts`。  
狀態：本文件是 Figma handoff spec；目前 session 未提供可直接建立 Figma nodes 的 MCP tool。

## Figma File Architecture

建議 Figma file pages：

- `00 Cover`：產品定位、版本、主要 flows。
- `01 Foundations`：colors、typography、spacing、radius、effects、motion。
- `02 Components / Core`：surface、button、input、badge、tabs、navbar。
- `03 Components / Audit Intelligence`：metric cards、DOM patch、CWV card、terminal、trend report、scan summary。
- `04 Screens / Home`：desktop、tablet、mobile。
- `05 Screens / Mission Control`：idle、running、complete。
- `06 Screens / Live Audit Dashboard`：idle、scanning、error、complete。
- `07 Interaction States`：loading、empty、error、success、focus、hover。
- `08 QA Notes`：accessibility、responsive behavior、data provenance。

## Foundations

### Color Variables

| Figma Variable | Source Token | Value | Usage |
| --- | --- | --- | --- |
| `color.canvas.default` | `surface.background` | `#020617` | App root background |
| `color.brand.slate` | `brand.slate` | `#0B0F19` | Deep surface base |
| `color.surface.elevated` | `brand.surface` | `#111827` | Raised cards and sections |
| `color.surface.glass` | `surface.glass` | `rgba(255,255,255,0.03)` | Glass panel base |
| `color.surface.glass.hover` | `surface.glassHover` | `rgba(255,255,255,0.06)` | Hover surface |
| `color.text.primary` | `brand.text` | `#F8FAFC` | Primary text |
| `color.text.muted` | `brand.muted` | `#94A3B8` | Secondary text |
| `color.brand.violet` | `brand.purple` | `#8B5CF6` | Brand accent and primary glow |
| `color.brand.cyan` | `brand.cyan` | `#06B6D4` | Data/scan accent |
| `color.brand.blue` | `brand.blue` | `#1D4ED8` | Technical/depth accent |
| `color.brand.green` | `brand.green` | `#05FFC4` | Presentation highlight |
| `color.status.success` | `semantic.success` | `#10B981` | Good/pass state |
| `color.status.warning` | `semantic.warning` | `#F59E0B` | Needs attention |
| `color.status.danger` | `semantic.danger` | `#F43F5E` | Critical/fail state |
| `color.border.subtle` | Tailwind `white/10` | `rgba(255,255,255,0.10)` | Default glass border |
| `color.border.strong` | Tailwind `white/15` | `rgba(255,255,255,0.15)` | Interactive border |

### Effect Variables

| Figma Effect | Source | Recommended Figma Setup |
| --- | --- | --- |
| `effect.shadow.glass` | `boxShadow.glass` | Drop shadow `0,24,80, rgba(2,6,23,0.45)` plus inner 1px white border |
| `effect.glow.violet` | `boxShadow.violet` | Drop shadow `0,0,40, rgba(139,92,246,0.35)` |
| `effect.glow.cyan` | `boxShadow.cyan` | Drop shadow `0,0,40, rgba(6,182,212,0.28)` |
| `effect.glow.blue` | GlassCard custom | Drop shadow `0,0,40, rgba(29,78,216,0.22)` |
| `effect.blur.glass` | `backdrop-blur-xl` / `[40px]` | Background blur `24-40px`; use 40px only on hero cards |

### Radius Variables

| Variable | Value | Usage |
| --- | --- | --- |
| `radius.sm` | `8px` | Focusable small controls |
| `radius.md` | `16px` | Pills, badges, compact cards |
| `radius.lg` | `24px` | `GlassCard`, DOM issue card, CWV card |
| `radius.xl` | `32px` | `GlassContainer`, major page sections |
| `radius.full` | `999px` | Buttons, navbar shell, status pills |

### Typography

Current stack: `Inter`, `San Francisco`, `system-ui`, `sans-serif`; monospace: `JetBrains Mono`, `Fira Code`, `monospace`.

| Text Style | Desktop | Mobile | Usage |
| --- | --- | --- | --- |
| `display.hero` | `64-72px / 0.95 / -0.06em` | `44-52px / 1.0` | Home hero H1 |
| `heading.section` | `36px / 1.2 / -0.03em` | `28px / 1.2` | Section titles |
| `heading.panel` | `20-24px / 1.25` | `18-22px` | Card/console panel titles |
| `body.default` | `16px / 1.75` | `15-16px / 1.7` | Main explanatory copy |
| `body.compact` | `14px / 1.6` | `14px / 1.6` | Dense dashboard copy |
| `caption.meta` | `11-12px / 1.4 / 0.16-0.24em` | `12px / 1.4` | Eyebrows and metadata |
| `code.inline` | `12-13px / 1.5` | `12px / 1.5` | Element IDs and snippets |

### Layout Grid

| Frame | Width | Container | Columns | Notes |
| --- | --- | --- | --- | --- |
| Desktop | `1440px` | `max-width 1280px`, `px 32px` | 12 columns | Main spec frame |
| Laptop | `1280px` | `max-width 1280px`, `px 32px` | 12 columns | Optional QA frame |
| Tablet | `768px` | `px 24px` | 6 columns | Dashboard stacks earlier |
| Mobile | `390px` | `px 16px` | 4 columns | Dedicated scan task flow |

Spacing scale should mirror Tailwind defaults used in the app: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96`.

## Core Component Specs

### `Surface`

Unifies `GlassCard`, `GlassContainer`, navbar shell, code panels, and dashboard cards.

Properties:

| Property | Values | Notes |
| --- | --- | --- |
| `type` | `card`, `container`, `nav`, `terminal`, `code` | Maps to current use cases |
| `priority` | `primary`, `standard`, `quiet` | Controls contrast and shadow intensity |
| `accent` | `none`, `violet`, `cyan`, `blue`, `success`, `warning`, `danger` | Severity accents must use status tokens |
| `state` | `default`, `hover`, `focus`, `loading`, `disabled` | Focus ring uses cyan |
| `density` | `comfortable`, `compact` | Console and mobile use compact |

Base visual:

- Fill: `color.surface.glass`, 3-6% white overlay.
- Border: `color.border.subtle`.
- Radius: `24px` for card, `32px` for container, `999px` for nav shell.
- Backdrop blur: `24px` standard, `40px` for hero/primary cards.
- Top highlight: 1px horizontal white gradient line.

### `Button`

Source: `GlowingButton`.

Properties:

| Property | Values |
| --- | --- |
| `variant` | `primary`, `secondary`, `ghost`, `danger` |
| `state` | `default`, `hover`, `pressed`, `focus`, `loading`, `disabled` |
| `size` | `sm`, `md`, `lg`, `full-width` |
| `icon` | `none`, `leading`, `trailing` |

Primary visual:

- Fill: `linear-gradient(135deg, rgba(139,92,246,0.95), rgba(29,78,216,0.92))`.
- Text: `color.text.primary`.
- Radius: full.
- Min height: `44px`.
- Glow: violet default, cyan hover.

Ghost visual:

- Fill: `rgba(255,255,255,0.06)`.
- Border: `rgba(255,255,255,0.15)`.
- Text: `rgba(255,255,255,0.90)`.

### `Navigation / Navbar`

Source: `Navbar`.

Desktop:

- Fixed top, `z-index` equivalent high layer.
- Container `max-width 1280px`.
- Shell: glass panel, full radius when closed.
- Left: brand button.
- Center: nav links with active pill.
- Right: language switcher, login/admin/console, start scan CTA.

Mobile:

- Brand left, language switcher + menu icon right.
- Expanded state changes shell radius from full to `24px`.
- Menu links use min height `44px`, stacked full width.

### `ConsoleTabs`

Routes:

- `Mission Control` with violet active state.
- `Live Execution` with cyan active state.
- `Standard Report` with emerald active state.
- `Presentation Deck` with amber active state.

Properties:

| Property | Values |
| --- | --- |
| `activeRoute` | `console`, `live`, `report`, `presentation` |
| `density` | `desktop`, `mobile` |
| `wrap` | `true`, `false` |

Design note: Route active colors are category colors, not severity colors. Do not reuse these colors to indicate risk.

### `URL Input / Scan Form`

Used by Home, Audit Console, and Live Dashboard.

Properties:

| Property | Values |
| --- | --- |
| `state` | `empty`, `filled`, `focus`, `error`, `loading`, `disabled` |
| `context` | `hero`, `console`, `live` |
| `helper` | `none`, `hint`, `validation`, `error` |

Required specs:

- Minimum control height: `48px`.
- Focus ring: cyan 60%.
- Error border: status danger.
- Loading state must preserve layout width to avoid jump.

### `Badge / Pill`

Properties:

| Property | Values |
| --- | --- |
| `tone` | `brand`, `cyan`, `violet`, `success`, `warning`, `danger`, `neutral` |
| `size` | `xs`, `sm`, `md` |
| `icon` | `none`, `leading` |
| `role` | `status`, `metadata`, `trust`, `data-source` |

Data source badges:

- `Browser Collector`
- `Lighthouse Lab`
- `CrUX Field`
- `AI Synthesis`
- `Estimated`

### `MetricCard`

Combines current metrics grid, `MetricRing`, and analytics chart summary.

Properties:

| Property | Values |
| --- | --- |
| `metric` | `performance`, `seo`, `accessibility`, `best-practices`, `lcp`, `inp`, `cls`, `requests`, `dom-depth` |
| `rating` | `good`, `needs-improvement`, `poor`, `unknown` |
| `trend` | `up-good`, `up-bad`, `down-good`, `down-bad`, `flat` |
| `dataSource` | `live`, `lab`, `field`, `estimated`, `history` |

Rules:

- Severity color must come from `rating`.
- Category color can be icon-only or subtle border, not primary fill.
- Delta labels should be explicit, for example `LCP +2.3 秒`.

### `AuditOutcomeHero`

New recommended component for Live Dashboard complete state.

Content slots:

- Overall status: `通過`, `需優化`, `嚴重衰退`.
- Main score or rating.
- One-sentence CTO-level summary.
- Top action CTA.
- Secondary action: export/report/presentation.

Properties:

| Property | Values |
| --- | --- |
| `severity` | `success`, `warning`, `danger` |
| `dataConfidence` | `high`, `medium`, `low` |
| `actionType` | `fix`, `investigate`, `monitor`, `export` |

### `DOMPatchCard`

Source: `DOMIssueHighlighter`.

Content:

- Issue type badge.
- Element ID code pill.
- Professional zh-TW description.
- Original snippet.
- Fixed snippet.
- Diff explanation.
- Copy fixed snippet action.

Properties:

| Property | Values |
| --- | --- |
| `issueType` | `missing_alt`, `multiple_h1`, `invalid_canonical`, `render_blocking` |
| `severity` | `info`, `warning`, `critical` |
| `expanded` | `true`, `false` |
| `copied` | `true`, `false` |

Design note: `issueType` color should not imply severity by itself. Add a separate severity chip.

### `CoreWebVitalsCard`

Source: `CoreWebVitalsCard`.

States:

- `idle`: pending copy.
- `loading`: skeleton cards.
- `field`: CrUX real-user metrics with field badge.
- `lab`: PageSpeed lab fallback with lab badge.
- `error`: danger alert.

Metrics:

- Field: LCP, INP, CLS with P75 value and sparkline.
- Lab: Performance score, FCP, LCP, CLS.

Design requirement:

- Field data must visually outrank lab fallback because it represents real users.
- Lab fallback must include an explanatory note to avoid overconfidence.

### `AnalyticsChartsPanel`

Source: `AnalyticsChartsPanel`.

Properties:

| Property | Values |
| --- | --- |
| `view` | `performance`, `seo` |
| `dataSource` | `live`, `fallback`, `trend` |
| `trendReport` | `none`, `moderate`, `severe` |
| `state` | `ready`, `empty`, `loading` |

Design requirement:

- If fallback values are displayed, show `估算資料` badge.
- If live summary is available, show `本次掃描` badge.
- If trend report exists, show it under the chart as an alert/report surface.

### `ExecutionTerminal`

Purpose: technical evidence stream, not primary decision surface.

Properties:

| Property | Values |
| --- | --- |
| `state` | `idle`, `streaming`, `complete`, `error` |
| `density` | `compact`, `comfortable` |
| `copy` | `enabled`, `disabled` |

Visual:

- Monospace text.
- Darker fill than glass panels.
- Accent only for state line, not full panel.

## Screen Specs

### Home / Desktop 1440

Frame structure:

1. Fixed navbar.
2. Hero section: 2-column grid.
3. Left hero copy: eyebrow, H1, paragraph, trust pills.
4. Right hero scan card: URL input, CTA row, progress/status preview.
5. Feature cards: 3-column grid.
6. Workflow cards: 3-step grid.
7. Preview cards: report intelligence and live evidence.

Hero layout:

- Container max width: `1280px`.
- Top padding: `112-128px`.
- Grid: left `1.05fr`, right `0.95fr`.
- Gap: `48-64px`.

Mobile behavior:

- Hero card appears below hero copy.
- Trust pills wrap under paragraph.
- CTA buttons stack full width.
- Feature/workflow cards become single column.

### Mission Control / Desktop 1440

Frame structure:

1. ConsoleTabs.
2. Centered page header and badge.
3. Mission input inside primary `GlassContainer`.
4. Metrics row.
5. Main mission stream panel.
6. Conditional final report panel.
7. Subagent/memory/capabilities panels.

States:

- `idle`: mission form, sample context, capability preview.
- `running`: stream active, current phase visible, cancel action.
- `complete`: final synthesis, report actions, evidence links.
- `error`: inline error panel plus retry action.

UX requirement:

- Add `Current Phase Summary` above long stream.
- Keep technical stream available, but default focus should be user outcome.

### Live Audit Dashboard / Desktop 1440

Frame structure:

1. ConsoleTabs.
2. Live dashboard header.
3. URL scan form and running status.
4. State-specific body.
5. Complete state recommended order:
   - `AuditOutcomeHero`
   - `TrendAlertReport` or analytics chart
   - `ScanSummaryPanel`
   - `CoreWebVitalsCard`
   - `DOMPatchCard` list
   - `ExecutionTerminal`
   - Report/presentation actions

Existing complete state currently starts with `AnalyticsChartsPanel`; Figma should model the improved order above.

Mobile behavior:

- Sticky scan status bar after form submission.
- Only top 1 critical issue expanded by default.
- Code snippets collapse behind `查看修補程式碼`.
- Report actions stay visible after outcome summary.

## Interaction And Motion

Motion principles:

- Background mesh: slow ambient movement, `18-22s`, infinite, ease-in-out.
- Card entrance: `opacity 0 -> 1`, `y 12-16 -> 0`, `0.22-0.4s`.
- Button hover: slight lift `-2px`, scale `1.01-1.02`.
- Button tap: scale `0.96-0.98`.
- Staggered issue cards: `0.05s` delay increments.
- Respect reduced motion by disabling transform-heavy ambient and nonessential movement.

Figma prototype notes:

- Use smart animate only for state transitions, not constant glow movement.
- Prototype important paths: start scan, running, error retry, complete report action, expand DOM patch.

## Accessibility Requirements

- Minimum interactive height: `44px`.
- Keyboard focus ring: cyan ring with dark offset.
- Avoid relying on glow/color alone for status; pair with label and icon.
- Text on translucent surfaces must meet WCAG AA contrast against the composited background.
- Use `aria-live` equivalent for scan status in implementation notes.
- Code blocks need copy buttons with accessible labels.
- Tiny uppercase labels should not drop below `12px` in zh-TW UI.

## Figma Conversion Checklist

- Create color variables before drawing screens.
- Create text styles before importing screen layouts.
- Build `Surface` first; reuse it for navbar, cards, containers, terminal, code blocks.
- Build `Button`, `Badge`, `Tabs`, `Input`, and `MetricCard` as component sets with variants.
- Build audit-specific components after core primitives: `AuditOutcomeHero`, `DOMPatchCard`, `CoreWebVitalsCard`, `AnalyticsChartsPanel`.
- Recreate Home, Mission Control, and Live Dashboard using component instances, not detached frames.
- Add desktop, tablet, and mobile frames for each major screen.
- Add annotations for data provenance and fallback states.
- Create a final QA page with contrast, responsive, and interaction acceptance criteria.

## Implementation Notes For Developers

- When Figma variants are approved, map them back to shared React props instead of duplicating Tailwind class strings across pages.
- Consider consolidating `GlassCard` and `GlassContainer` into a shared `Surface` API after design approval.
- In Live Dashboard, connect `AnalyticsChartsPanel` to real `summary` data and show explicit fallback state when summary is absent.
- Keep severity tokens independent from brand accents in both Figma and Tailwind.
- Add `AuditOutcomeHero` before expanding more technical dashboard panels.
