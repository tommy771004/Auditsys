# AuditLens Figma Design Ops & Component Specs

## 1. Frame Structure & Responsive Grids

### 1.1 Breakpoints
*   **Mobile (sm):** `375px` width (Responsive scaling, auto-height)
*   **Tablet/Small Desktop (md/lg):** `1024px` width
*   **Desktop (xl/2xl):** `1440px` width (Max-width for content container: `1280px` / `max-w-7xl`)

### 1.2 Layout Grids
*   **Desktop Grid:** 12 columns, `24px` gutters, `80px` margins. Behavior: Stretch.
*   **Mobile Grid:** 4 columns, `16px` gutters, `20px` Margins. Behavior: Stretch.
*   **Global Box Model:** `8px` grid system. All margins and paddings must be multiples of 8 (e.g., 8, 16, 24, 32, 40) or occasionally 4 for tight UI clusters.

---

## 2. Design Tokens & Core Styles

### 2.1 Colors
*   **Backgrounds / Surfaces:**
    *   `bg-brand-slate` (Global Background): `#0B0F19`
    *   `bg-brand-surface` (Surface Context): `#111827`
    *   `bg-white/5` to `bg-white/10` (Glass overlays)
*   **Typography:**
    *   `text-brand` (Primary Text): `#F8FAFC`
    *   `text-brand-muted` (Secondary/Helpers): `#94A3B8`
*   **Accents & Semantics:**
    *   `brand-purple` (AI Highlights/Glows): `#8B5CF6`
    *   `brand-cyan` (Progress, System Validations): `#06B6D4`
    *   `brand-blue` (Gradient Base Mix): `#1D4ED8`
    *   `brand-danger` (Errors/Destructive): `#FB7185`
*   **Gradients:**
    *   `brand-gradient`: Linear, 135deg. `rgba(139,92,246,0.95)` to `rgba(29,78,216,0.92)`

### 2.2 Typography (Font Styles)
*   **Typeface:** `Inter` (Sans) globally. Ensure weights used are Regular (400), Medium (500), and SemiBold (600).
*   **Typeface (Tech accents):** `JetBrains Mono` or `Fira Code`.
*   **H1 (Hero):** 56px (Desktop) / 40px (Mobile), Line Height: 1.1, Letter Spacing: `-0.04em`. SemiBold.
*   **H2 (Section Titles):** 36px (Desktop) / 28px (Mobile), Line Height: 1.2, Letter Spacing: `-0.03em`. SemiBold.
*   **Eyebrow:** 12px, Uppercase, Letter Spacing: `0.24em`. SemiBold. `brand-cyan` or `white/55`.
*   **Body (Base):** 16px, Line Height: 1.5, Regular. `text-brand-muted`.

### 2.3 Effects & Layer Styles
*   **Glass Panel Base:** `border: 1px solid rgba(255,255,255,0.10)`, `background: rgba(11,15,25,0.85)`, `backdrop-blur: 24px`.
*   **Drop Shadow (Glass):** `0 24px 80px rgba(2,6,23,0.45)` with a `0 0 0 1px rgba(255,255,255,0.08)` inner ring.
*   **Glow (Purple):** `0 0 40px rgba(139,92,246,0.35)`
*   **Glow (Cyan):** `0 0 40px rgba(6,182,212,0.28)`

---

## 3. Component Architecture & Auto Layout

### 3.1 GlowingButton
*   **Properties:**
    *   `Variant`: Default, Ghost
    *   `State`: Default, Hover, Active, Loading, Disabled
    *   `Icon`: Left, Right, None
*   **Auto Layout Spec:**
    *   Direction: Horizontal
    *   Spacing: `8px`
    *   Padding: `16px` Horizontal, `12px` Vertical
    *   Min-height: `44px` (Accessibility standard)
    *   Align: Center / Center
    *   Resizing: Hug Contents (Width/Height)
*   **Styling (Default):** Relative wrapper with trailing absolute glow `blur-xl`. Button surface is translucent black with white text.

### 3.2 GlassCard
*   **Properties:**
    *   `Glow`: Default (None), Purple, Cyan
    *   `Padding`: Default (`24px`), Large (`32px`)
*   **Auto Layout Spec:**
    *   Direction: Vertical
    *   Spacing: Variable (typically `24px` item gap)
    *   Resizing: Fill Container (Width), Hug Contents (Height)
*   **Border Radius:** `24px`

### 3.3 Text Input (Intake Console)
*   **Properties:**
    *   `State`: Default, Active/Focus, Error, Disabled
*   **Auto Layout Spec:**
    *   Direction: Horizontal
    *   Spacing: `12px`
    *   Padding H: `16px`, Padding V: `12px`
    *   Min-height: `44px`
*   **Styling:** Focus ring uses `rgba(6,182,212,0.5)` width 2px.

---

## 4. Prototype Flows & Micro-interactions

*   **Intake Flow (Home -> Audit Console):**
    *   **Trigger:** Click on "Start Scan".
    *   **Animation:** Smart Animate, 300ms Ease-Out. Route transition fades out Hero, fades in GlassCard multi-step progress.
*   **Button Hover:**
    *   **Behavior:** While hovering -> Scale to `1.02` (if Ghost) or trigger glow intensity increase. Glow opacity transitions from `0` to `1` over `300ms`.
    *   **Tap Behavior:** Scale to `0.98` for tactile feedback.
*   **Progress Bar (Audit Console):**
    *   **Animation:** After delay (simulating engine), transition width from `0%` to `100%` using Linear `2000ms`.

---

## 5. Dev Handoff Configuration

### 5.1 Naming Conventions (React <> Figma mapping)
*   Name components exactly as they appear in the React repo.
*   `GlassCard` -> `components/ui/GlassCard.tsx`
*   `GlowingButton` -> `components/ui/GlowingButton.tsx`
*   `PageContainer` -> Layout wrapper frame.

### 5.2 CSS Export Checks
*   Developers use Tailwind CSS. Ensure Figma Inspector outputs raw HEX or RGBA values that map clearly to `tailwind.config.ts`.
*   *Do not* bake margins into components; rely on layout frames (Auto Layout gaps) to represent Tailwind `gap-x`, `gap-y`, and `space-y-x` utilities.

---

## 6. Accessibility (A11y) Notes

*   **Touch Targets:** Minimum interactive area is `44x44px` on mobile screens. All `GlowingButton` and Form Inputs must satisfy this rule.
*   **WCAG Contrast Checks:** 
    *   `text-brand-muted` (`#94A3B8`) against `bg-brand-slate` (`#0B0F19`) yields `4.54:1` (Passes AA for standard text).
    *   `text-brand` (`#F8FAFC`) against `bg-brand-slate` yields `15.9:1` (Passes AAA).
*   **Focus States:** All interactive elements must have a defined keyboard focus state (usually a `2px solid` Cyan or Purple outline overlapping the border).
*   **Screen Readers:** Order of Auto Layout layers must match the logical reading DOM order (Top to Bottom, Left to Right). Ensure complex visual architectures do not disrupt source order.
