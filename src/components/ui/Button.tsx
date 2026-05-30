import React, { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, type HTMLMotionProps } from "framer-motion";
import ShimmerText from "./ShimmerText";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingLabel?: string;
}

// 彈簧物理參數
const HOVER_SPRING = { type: "spring", stiffness: 400, damping: 25 };
const TAP_SPRING = { type: "spring", stiffness: 600, damping: 30, mass: 0.8 };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, loadingLabel = "Loading...", onClick, disabled, children, ...props }, ref) => {
    // 液態游標追蹤
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    // 手勢防誤觸機制
    const [isTapped, setIsTapped] = useState(false);
    const touchStart = useRef({ x: 0, y: 0 });
    const isScrolling = useRef(false);

    const isDisabled = disabled || isLoading;

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      if (e.pointerType === "touch") {
        touchStart.current = { x: e.clientX, y: e.clientY };
        isScrolling.current = false;
      }
      setIsTapped(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "touch" && isTapped) {
        const deltaX = Math.abs(e.clientX - touchStart.current.x);
        const deltaY = Math.abs(e.clientY - touchStart.current.y);
        if (deltaX > 10 || deltaY > 10) {
          isScrolling.current = true;
          setIsTapped(false);
        }
      }
    };

    const handlePointerUp = () => setIsTapped(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isScrolling.current || isDisabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (onClick) onClick(e);
    };

    // A11y & Base Styling
    const baseStyle = "group relative overflow-hidden inline-flex items-center justify-center font-semibold rounded-2xl outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
    
    const variantStyles = {
      primary: "bg-brand-gradient text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]",
      secondary: "bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:border-white/20",
      ghost: "bg-transparent text-white/80 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10",
      danger: "bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs min-h-[32px] rounded-xl",
      md: "px-4 py-2.5 text-sm min-h-[44px] rounded-2xl",
      lg: "px-6 py-3.5 text-base min-h-[52px] rounded-[20px]",
    };

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        // 點擊的彈簧物理學
        animate={{ scale: isTapped ? 0.97 : 1 }}
        whileHover={isDisabled || isTapped ? {} : { scale: 1.02, transition: HOVER_SPRING }}
        transition={isTapped ? TAP_SPRING : HOVER_SPRING}
        className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? "opacity-60 cursor-not-allowed hover:shadow-none" : "cursor-pointer"} ${className}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        {...props}
      >
        {/* 液態游標追蹤效果 */}
        {!isDisabled && (variant === "primary" || variant === "secondary" || variant === "danger") && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: useMotionTemplate`radial-gradient(100px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.15), transparent 80%)`,
            }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          {isLoading ? <ShimmerText text={loadingLabel} /> : children}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";
