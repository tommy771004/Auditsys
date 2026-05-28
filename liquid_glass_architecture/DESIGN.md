---
name: Liquid Glass Architecture
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#cfc2d6'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#988d9f'
  outline-variant: '#4d4354'
  surface-tint: '#ddb7ff'
  primary: '#ddb7ff'
  on-primary: '#490080'
  primary-container: '#b76dff'
  on-primary-container: '#400071'
  inverse-primary: '#842bd2'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#b4c5ff'
  on-tertiary: '#002a78'
  tertiary-container: '#618bff'
  on-tertiary-container: '#002469'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f0dbff'
  primary-fixed-dim: '#ddb7ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#6900b3'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  stack-xl: 64px
---

## Brand & Style

The design system is engineered for a premium web architecture audit service, targeting CTOs and lead architects who demand technical precision wrapped in a sophisticated, high-tech aesthetic. The brand personality is authoritative yet visionary, evoking the feeling of looking through a high-resolution lens at complex digital structures.

The visual style is **Liquid Glass**, a refined evolution of Glassmorphism. It leverages high-depth layering, organic background motion, and hyper-precise linework to create an interface that feels like a physical piece of illuminated hardware. The emotional response should be one of absolute trust, clarity, and futuristic capability.

## Colors

The palette is rooted in a deep-space foundation to ensure maximum contrast for "liquid" elements.

- **Base Surface:** #0B0F19 (Deep Dark Slate). This is the infinite canvas.
- **Accents:** Neon Purple (#A855F7) for primary actions, Cyan (#22D3EE) for success and technical highlights, and Deep Ocean Blue (#2563EB) for structural elements.
- **Text:** Pure White (#FFFFFF) for primary headers to ensure "glow" legibility; Muted Gray (#94A3B8) for secondary metadata.
- **Atmosphere:** The background must utilize soft, organic mesh gradients that slowly animate to prevent a static feel.

## Typography

This design system utilizes **Inter** for its geometric clarity and exceptional legibility in dark environments. The typography follows a high-contrast hierarchy tailored for Traditional Chinese (繁體中文) characters, which require slightly more line-height than Latin scripts to maintain clarity at smaller scales.

**Special Treatment:**
- **Primary Metrics:** High-impact numbers should use a subtle outer glow (`0 0 12px rgba(168, 85, 247, 0.4)`).
- **Headlines:** Use tighter letter-spacing for large display titles to achieve an "Apple-inspired" editorial look.

## Layout & Spacing

The design system employs a **Fluid Grid** model centered within a fixed-width container for desktop layouts. 

- **Desktop (1440px+):** 12-column grid with 24px gutters and wide 64px side margins to emphasize the "floating" nature of the glass modules.
- **Tablet (768px - 1024px):** 8-column grid with 20px gutters.
- **Mobile (Under 768px):** 4-column grid with 16px gutters and 20px margins.

Spacing is strictly mathematical, built on an 8px base unit. Vertical rhythm should be generous to allow the "liquid" background gradients to breathe between content sections.

## Elevation & Depth

Depth is the defining characteristic of this design system. It does not use traditional drop shadows, but rather **Tonal Glass Layering**:

1.  **Level 0 (Background):** Deep Dark Slate with animated mesh gradients.
2.  **Level 1 (Cards):** 16px Backdrop-blur, `rgba(255, 255, 255, 0.03)` fill, and a 1px semi-transparent border (`rgba(255, 255, 255, 0.1)`).
3.  **Level 2 (Modals/Floating Pills):** 32px Backdrop-blur, `rgba(255, 255, 255, 0.08)` fill, and a more pronounced top-edge highlight to simulate light hitting the glass rim.

Shadows, when used, are "Ambient Glows" colored after the primary accent (Purple or Cyan) with 0% spread and high blur (40px+), used only to highlight active technical modules.

## Shapes

The shape language is sophisticated and "squircle" inspired. Elements use a baseline 0.5rem (8px) radius, but primary layout containers and glass cards use a more generous 1rem (16px) or 1.5rem (24px) radius to soften the technical edge. Interactive "Pills" use a fully rounded (capsule) radius to differentiate them from information containers.

## Components

### Buttons
- **Primary:** Vibrant gradient (Neon Purple to Deep Ocean Blue) with a white text label. 1px inner border for "glass" shine.
- **Ghost:** 1px border (`rgba(255,255,255,0.2)`) with a backdrop-blur. On hover, increase blur and fill opacity.

### Glass Cards
- Used for audit summaries. Must include a 1px "light-leak" border at the top-left to simulate glass thickness.
- Background: `backdrop-filter: blur(16px) saturate(180%);`.

### Floating Pills
- Used for status tags (e.g., "Pass", "Critical"). 
- Fully rounded corners. Backgrounds should be highly translucent but saturated with the status color (e.g., Transparent Cyan for "Secure").

### Input Fields
- Dark, recessed appearance using an inner shadow. 
- On focus, the 1px border should transition to Neon Purple with a subtle outer glow.

### Lists & Data Grids
- Separated by thin `rgba(255,255,255,0.05)` lines. 
- Hover states should trigger a light-wash background (`rgba(255,255,255,0.02)`).

### Additional Components: "The Audit Lens"
- A specific UI pattern for architecture diagrams where the background is a sharp grid and the "lens" (a glass card) passes over it to magnify and clarify code structures.