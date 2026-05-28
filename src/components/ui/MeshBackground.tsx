import { motion } from "framer-motion";

interface MeshBackgroundProps {
  variant?: "default" | "console";
}

export default function MeshBackground({ variant = "default" }: MeshBackgroundProps) {
  const leftGlowClassName = variant === "console" ? "bg-violet-500/32 blur-[160px]" : "bg-brand-purple/30 blur-[130px]";
  const rightGlowClassName = variant === "console" ? "bg-cyan-400/28 blur-[145px]" : "bg-brand-cyan/30 blur-[120px]";
  const bottomGlowClassName = variant === "console" ? "bg-blue-500/24 blur-[165px]" : "bg-brand-blue/25 blur-[140px]";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className={["absolute left-[-12%] top-[-14%] h-[34rem] w-[34rem] rounded-full", leftGlowClassName].join(" ")}
        animate={{
          x: [0, 48, -24, 0],
          y: [0, 32, 56, 0],
          scale: [1, 1.08, 0.94, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={["absolute right-[-10%] top-[12%] h-[28rem] w-[28rem] rounded-full", rightGlowClassName].join(" ")}
        animate={{
          x: [0, -44, 16, 0],
          y: [0, 28, -24, 0],
          scale: [1, 0.92, 1.06, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={["absolute bottom-[-18%] left-[28%] h-[30rem] w-[30rem] rounded-full", bottomGlowClassName].join(" ")}
        animate={{
          x: [0, 34, -28, 0],
          y: [0, -36, 18, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className={variant === "console" ? "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%)]" : "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_32%)]"} />
    </div>
  );
}
