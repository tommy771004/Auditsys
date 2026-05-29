import React from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number; // 0 to 100
  height?: number;
  className?: string;
  delay?: number;
}

export default function ProgressBar({
  value,
  height = 4,
  className = "",
  delay = 0,
}: ProgressBarProps) {
  let colorClass = "bg-emerald-400";
  if (value < 50) {
    colorClass = "bg-rose-400";
  } else if (value < 90) {
    colorClass = "bg-amber-400";
  }

  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/10 ${className}`} style={{ height }}>
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: "0%" }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut", delay }}
      />
    </div>
  );
}
