import React, { useRef, useState } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  hoverable?: boolean;
  interactive?: boolean; // Set to true to enable tap spring and pointer gesture cancellation
  glow?: "purple" | "cyan" | "blue" | "none";
}

const glowClasses: Record<NonNullable<CardProps["glow"]>, string> = {
  purple: "shadow-violet",
  cyan: "shadow-cyan",
  blue: "shadow-[0_0_40px_rgba(29,78,216,0.22)]",
  none: "",
};

const HOVER_SPRING = { type: "spring", stiffness: 400, damping: 25 };
const TAP_SPRING = { type: "spring", stiffness: 600, damping: 30, mass: 0.8 };

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", hoverable = false, interactive = false, glow = "none", onClick, children, ...props }, ref) => {
    // 手勢防誤觸機制
    const [isTapped, setIsTapped] = useState(false);
    const touchStart = useRef({ x: 0, y: 0 });
    const isScrolling = useRef(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      if (e.pointerType === "touch") {
        touchStart.current = { x: e.clientX, y: e.clientY };
        isScrolling.current = false;
      }
      setIsTapped(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !isTapped) return;
      if (e.pointerType === "touch") {
        const deltaX = Math.abs(e.clientX - touchStart.current.x);
        const deltaY = Math.abs(e.clientY - touchStart.current.y);
        if (deltaX > 10 || deltaY > 10) {
          isScrolling.current = true;
          setIsTapped(false);
        }
      }
    };

    const handlePointerUp = () => setIsTapped(false);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive && !onClick) return;
      if (isScrolling.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (onClick) onClick(e);
    };

    const isHoverActive = hoverable || interactive;

    // A11y & Base Styling
    const baseStyle = "relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02] backdrop-blur-[40px] backdrop-saturate-[150%] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 transition-all duration-300";

    return (
      <motion.div
        ref={ref}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        // 點擊的彈簧物理學
        animate={{ scale: isTapped ? 0.97 : 1 }}
        whileHover={isHoverActive && !isTapped ? { 
          scale: 1.015, 
          y: -4,
          // 桌面端懸停 (Hover) 的細微陰影擴散與過渡
          boxShadow: "0 24px 60px -8px rgba(255,255,255,0.08), 0 8px 20px -4px rgba(255,255,255,0.04)",
          borderColor: "rgba(255,255,255,0.2)",
          transition: { duration: 0.2, ease: "easeOut" } 
        } : {}}
        transition={isTapped ? TAP_SPRING : HOVER_SPRING}
        className={`${baseStyle} ${interactive ? "cursor-pointer select-none" : ""} ${glowClasses[glow]} ${className}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (interactive && onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick(e as any);
          }
        }}
        {...props}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";
