import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface MetricRingProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  delay?: number;
}

export default function MetricRing({
  value,
  size = 48,
  strokeWidth = 4,
  delay = 0,
}: MetricRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  // Determine color based on value
  let strokeColor = "stroke-emerald-400";
  let bgClass = "text-emerald-400/20";
  if (value < 50) {
    strokeColor = "stroke-rose-400";
    bgClass = "text-rose-400/20";
  } else if (value < 90) {
    strokeColor = "stroke-amber-400";
    bgClass = "text-amber-400/20";
  }

  return (
    <div className="relative flex items-center justify-center font-semibold" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90 transform" width={size} height={size}>
        <circle
          className={bgClass}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={strokeColor}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut", delay }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: delay + 0.5 }}
        className="text-[13px] text-white"
      >
        {value}
      </motion.span>
    </div>
  );
}
