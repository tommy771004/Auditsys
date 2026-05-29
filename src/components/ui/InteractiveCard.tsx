/**
 * InteractiveCard
 *
 * A fully-accessible, physics-spring-driven card component with:
 *  - whileHover: lift + soft shadow bloom + subtle border glow
 *  - whileTap:  scale-down with spring rebound
 *  - :focus-visible ring for keyboard navigation (WCAG 2.4.7)
 *  - Separate spring configs for hover (soft) vs tap (snappy)
 *  - Works correctly on touch devices (no hover ghost-state)
 *
 * Usage:
 *   <InteractiveCard onClick={() => …} aria-label="View report">
 *     …children…
 *   </InteractiveCard>
 */

import { type HTMLAttributes, type ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// ── Spring presets ────────────────────────────────────────────────────────────

/**
 * Hover spring: gentle and floaty.
 * Low stiffness + moderate damping = slow rise, smooth settle.
 */
const HOVER_SPRING = { type: "spring", stiffness: 260, damping: 22 } as const;

/**
 * Tap spring: snappy and responsive.
 * High stiffness + low damping = instant compress, bouncy release.
 */
const TAP_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

// ── Tilt helpers ──────────────────────────────────────────────────────────────
// Adds a subtle 3-D perspective tilt that follows the cursor on desktop.
// On touch devices pointer events are not tracked, so it stays flat.

const MAX_TILT_DEG = 6; // maximum rotation in any direction

// ── Types ─────────────────────────────────────────────────────────────────────

export type InteractiveCardVariant =
  | "default"   // violet-cyan gradient border
  | "success"   // emerald
  | "warning"   // amber
  | "danger"    // rose
  | "ghost";    // transparent / subtle

interface InteractiveCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: InteractiveCardVariant;
  /** Extra Tailwind classes forwarded to the outer motion div */
  className?: string;
  /** When true the card renders in a disabled / inert visual state */
  disabled?: boolean;
  /** Forwarded as aria-label for screen readers */
  "aria-label"?: string;
  onClick?: () => void;
  /** Show a coloured accent line at the top of the card */
  accentLine?: boolean;
}

// ── Variant maps ──────────────────────────────────────────────────────────────

const VARIANT_BORDER: Record<InteractiveCardVariant, string> = {
  default: "border-violet-400/20",
  success: "border-emerald-400/20",
  warning: "border-amber-400/20",
  danger:  "border-rose-400/20",
  ghost:   "border-white/10",
};

const VARIANT_SHADOW_HOVER: Record<InteractiveCardVariant, string> = {
  default: "0 24px 60px -8px rgba(139,92,246,0.28), 0 8px 20px -4px rgba(6,182,212,0.18)",
  success: "0 24px 60px -8px rgba(52,211,153,0.28), 0 8px 20px -4px rgba(16,185,129,0.15)",
  warning: "0 24px 60px -8px rgba(251,191,36,0.26), 0 8px 20px -4px rgba(245,158,11,0.14)",
  danger:  "0 24px 60px -8px rgba(251,113,133,0.28), 0 8px 20px -4px rgba(244,63,94,0.16)",
  ghost:   "0 24px 60px -8px rgba(255,255,255,0.08), 0 8px 20px -4px rgba(255,255,255,0.04)",
};

const VARIANT_GLOW: Record<InteractiveCardVariant, string> = {
  default: "rgba(139,92,246,0.6)",
  success: "rgba(52,211,153,0.6)",
  warning: "rgba(251,191,36,0.6)",
  danger:  "rgba(251,113,133,0.6)",
  ghost:   "rgba(255,255,255,0.3)",
};

const VARIANT_ACCENT: Record<InteractiveCardVariant, string> = {
  default: "bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-500",
  success: "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400",
  warning: "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400",
  danger:  "bg-gradient-to-r from-rose-400 via-red-300 to-rose-400",
  ghost:   "bg-gradient-to-r from-white/20 via-white/40 to-white/20",
};

// ── Focus ring (keyboard navigation / WCAG 2.4.7) ────────────────────────────

const FOCUS_RING_COLOR: Record<InteractiveCardVariant, string> = {
  default: "focus-visible:ring-violet-400/70",
  success: "focus-visible:ring-emerald-400/70",
  warning: "focus-visible:ring-amber-400/70",
  danger:  "focus-visible:ring-rose-400/70",
  ghost:   "focus-visible:ring-white/40",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function InteractiveCard({
  children,
  variant = "default",
  className = "",
  disabled = false,
  accentLine = false,
  onClick,
  "aria-label": ariaLabel,
  ...rest
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Smooth tilt motion values (spring-dampened for natural feel)
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(rawRotateY, { stiffness: 200, damping: 20 });

  // Cursor-tracked highlight shimmer (x position 0→1 across the card)
  const highlightX = useMotionValue(0.5);
  const highlightOpacity = useSpring(0, { stiffness: 200, damping: 28 });
  const highlightLeft = useTransform(highlightX, [0, 1], ["0%", "100%"]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = (e.clientX - rect.left) / rect.width;   // 0 → 1
    const cy = (e.clientY - rect.top)  / rect.height;  // 0 → 1

    // Map cursor position to tilt: centre = 0°, edges = ±MAX_TILT_DEG
    rawRotateY.set((cx - 0.5) * 2 * MAX_TILT_DEG);
    rawRotateX.set((0.5 - cy) * 2 * MAX_TILT_DEG);
    highlightX.set(cx);
  }

  function handleMouseLeave() {
    rawRotateX.set(0);
    rawRotateY.set(0);
    highlightOpacity.set(0);
  }

  function handleMouseEnter() {
    if (!disabled) highlightOpacity.set(1);
  }

  const isInteractive = Boolean(onClick) && !disabled;

  return (
    <motion.div
      ref={cardRef}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}

      // ── Framer Motion interaction props ──────────────────────────────────
      whileHover={disabled ? {} : {
        y: -6,
        scale: 1.015,
        boxShadow: VARIANT_SHADOW_HOVER[variant],
        borderColor: VARIANT_GLOW[variant],
        transition: HOVER_SPRING,
      }}
      whileTap={disabled ? {} : {
        scale: 0.97,
        y: -2,
        transition: TAP_SPRING,
      }}
      // 3-D tilt (cursor-tracked, spring-damped)
      style={{ rotateX, rotateY, transformPerspective: 900 }}

      // ── Event handlers ────────────────────────────────────────────────────
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}

      // ── Base styles ───────────────────────────────────────────────────────
      className={[
        // Layout & shape
        "relative overflow-hidden rounded-[24px] border bg-white/[0.04] backdrop-blur-xl",
        // Border
        VARIANT_BORDER[variant],
        // Base shadow
        "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]",
        // Transition for non-motion properties
        "transition-colors duration-300",
        // Cursor
        isInteractive ? "cursor-pointer select-none" : "cursor-default",
        // Disabled state
        disabled ? "opacity-40 grayscale pointer-events-none" : "",
        // Focus ring (keyboard nav / WCAG 2.4.7)
        "outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        FOCUS_RING_COLOR[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(rest as object)}
    >
      {/* Accent line at the top */}
      {accentLine && (
        <div className={`absolute inset-x-0 top-0 h-[2px] ${VARIANT_ACCENT[variant]}`} />
      )}

      {/* Cursor-tracked highlight shimmer */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: highlightOpacity }}
        aria-hidden
      >
        <motion.div
          className="absolute top-0 h-full w-[45%] -translate-x-1/2"
          style={{ left: highlightLeft }}
        >
          <div className="h-full w-full bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent" />
        </motion.div>
      </motion.div>

      {/* Card content */}
      {children}
    </motion.div>
  );
}
