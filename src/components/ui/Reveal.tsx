import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal starts (seconds). */
  delay?: number;
  /** Initial vertical offset in px. */
  y?: number;
  /** Re-trigger every time it scrolls into view (default: only once). */
  once?: boolean;
  /** Fraction of the element that must be visible before firing (0-1). */
  amount?: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fade-up-on-scroll wrapper. Fires when scrolled into view (framer `whileInView`).
 * Honours `prefers-reduced-motion` by rendering the final state with no animation.
 */
export function Reveal({ children, className, delay = 0, y = 24, once = true, amount = 0.2 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  once?: boolean;
  amount?: number;
  /** Gap between each child's reveal (seconds). */
  stagger?: number;
}

/**
 * Staggered container — direct `RevealItem` children animate in sequence as the
 * group scrolls into view.
 */
export function RevealGroup({ children, className, once = true, amount = 0.2, stagger = 0.1 }: RevealGroupProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };

  return (
    <motion.div className={className} variants={container} initial="hidden" whileInView="visible" viewport={{ once, amount }}>
      {children}
    </motion.div>
  );
}

interface RevealItemProps {
  children: ReactNode;
  className?: string;
  y?: number;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Child of `RevealGroup` — inherits the staggered timing. */
export function RevealItem({ children, className, y = 20 }: RevealItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={y === 20 ? itemVariants : { hidden: { opacity: 0, y }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
      {children}
    </motion.div>
  );
}

export default Reveal;
