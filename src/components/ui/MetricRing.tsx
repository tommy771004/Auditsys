import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export interface MetricRingProps {
  /** The value of the metric, from 0 to 100 */
  value: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring in pixels */
  strokeWidth?: number;
  /** Optional subtitle or label under the score inside the ring */
  label?: string;
  /** Unique id for targeting with CSS, or tracking */
  id?: string;
  /** Optional extra classes for the outer container */
  className?: string;
  /** Whether to animate the transition */
  animate?: boolean;
  /** Enable dynamic neon ambient glow behind the ring */
  showGlow?: boolean;
}

export default function MetricRing({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  id,
  className = "",
  animate = true,
  showGlow = true,
}: MetricRingProps) {
  // Ensure the score is bounded between 0 and 100 safely
  const clampedValue = Math.min(100, Math.max(0, value));
  
  // Local state to handle first-load delay transitions nicely
  const [displayValue, setDisplayValue] = useState(animate ? 0 : clampedValue);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setDisplayValue(clampedValue);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(clampedValue);
    }
  }, [clampedValue, animate]);

  // Radius and Circumference computation
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;

  // Decide colors based on score value
  const getColorTheme = (val: number) => {
    if (val < 50) {
      return {
        stroke: "stroke-rose-500/90 dark:stroke-rose-400/90",
        text: "text-rose-600 dark:text-rose-400",
        track: "stroke-rose-500/10 dark:stroke-rose-400/5",
        solidColors: "from-rose-500 to-pink-500",
        lightBg: "bg-rose-500/10",
        glowColor: "rgba(244, 63, 94, 0.28)",
        glowClass: "shadow-[0_0_24px_rgba(244,63,94,0.15)]",
        status: "critical",
      };
    }
    if (val < 90) {
      return {
        stroke: "stroke-amber-500/90 dark:stroke-amber-400/90",
        text: "text-amber-600 dark:text-amber-400",
        track: "stroke-amber-500/10 dark:stroke-amber-400/5",
        solidColors: "from-amber-500 to-orange-500",
        lightBg: "bg-amber-500/10",
        glowColor: "rgba(245, 158, 11, 0.28)",
        glowClass: "shadow-[0_0_24px_rgba(245,158,11,0.15)]",
        status: "warning",
      };
    }
    return {
      stroke: "stroke-emerald-500/90 dark:stroke-emerald-400/90",
      text: "text-emerald-600 dark:text-emerald-400",
      track: "stroke-emerald-500/10 dark:stroke-emerald-400/5",
      solidColors: "from-emerald-500 to-teal-500",
      lightBg: "bg-emerald-500/10",
      glowColor: "rgba(16, 185, 129, 0.28)",
      glowClass: "shadow-[0_0_24px_rgba(16,185,129,0.15)]",
      status: "optimal",
    };
  };

  const theme = getColorTheme(clampedValue);
  const componentId = id || `metric-ring-${clampedValue}-${Math.floor(Math.random() * 1000)}`;

  return (
    <div
      id={componentId}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background glow shadow for premium deep ambient feel */}
      {showGlow && (
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-700 ease-outBlur"
          style={{
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            backgroundColor: theme.glowColor,
            filter: "blur(24px)",
            opacity: 0.35,
          }}
        />
      )}

      {/* SVG Container */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        <defs>
          {/* Circular gradient on progression stroke */}
          <linearGradient id={`grad-${componentId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="stop-color-from" stopColor={clampedValue < 50 ? "#f43f5e" : clampedValue < 90 ? "#f59e0b" : "#10b981"} />
            <stop offset="100%" className="stop-color-to" stopColor={clampedValue < 50 ? "#ec4899" : clampedValue < 90 ? "#ea580c" : "#14b8a6"} />
          </linearGradient>

          {/* Core SVG stroke ambient glow filter */}
          <filter id={`svg-glow-${componentId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Circular Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className={`${theme.track} transition-all duration-500`}
        />

        {/* Circular Highlight Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          stroke={`url(#grad-${componentId})`}
          strokeLinecap="round"
          strokeDasharray={circumference}
          filter={`url(#svg-glow-${componentId})`}
          style={{ strokeDashoffset }}
          transition={
            animate
              ? {
                  type: "spring",
                  stiffness: 45,
                  damping: 12,
                  mass: 1,
                }
              : undefined
          }
        />
      </svg>

      {/* Center typography score content */}
      <div className="absolute inset-x-0 flex flex-col items-center justify-center text-center">
        <div className="flex items-baseline justify-center">
          <motion.span
            id={`${componentId}-score`}
            className={`font-sans font-bold tracking-tight text-white`}
            style={{
              fontSize: size > 150 ? "3.25rem" : size > 100 ? "2rem" : "1.25rem",
              lineHeight: 1,
            }}
          >
            {displayValue.toFixed(0)}
          </motion.span>
          <span
            className="text-white/40 font-semibold font-sans ml-0.5"
            style={{
              fontSize: size > 150 ? "1.125rem" : size > 100 ? "0.875rem" : "0.625rem",
            }}
          >
            %
          </span>
        </div>

        {label && (
          <span
            id={`${componentId}-label`}
            className="text-white/50 uppercase tracking-[0.16em] font-mono mt-1 select-none font-medium"
            style={{
              fontSize: size > 150 ? "10px" : size > 100 ? "8px" : "6px",
              maxWidth: size - strokeWidth * 3,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
