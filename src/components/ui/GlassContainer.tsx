import React, { useRef, useState } from "react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";

interface GlassContainerProps extends HTMLMotionProps<"section"> {
  children: React.ReactNode;
  accent?: "violet" | "cyan" | "blue" | "teal" | "purple";
}

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 400, damping: 25 } 
  }
};

export default function GlassContainer({ children, className, accent, variants, ...props }: GlassContainerProps) {
  const divRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.section
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      layout
      variants={variants || defaultVariants}
      whileHover={{ y: -2, boxShadow: "0px 30px 60px rgba(0,0,0,0.5)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "relative overflow-hidden rounded-sm border border-[var(--border)] bg-white/[0.02] p-5 sm:p-8 text-[var(--text)] backdrop-blur-[40px] backdrop-saturate-[150%] shadow-[var(--shadow)]",
        "before:absolute before:inset-0 before:rounded-sm before:border before:border-white/10 before:[mask-image:linear-gradient(to_bottom,white,transparent)] before:pointer-events-none",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="relative z-20">{children}</div>
    </motion.section>
  );
}
