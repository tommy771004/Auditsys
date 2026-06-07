import { motion } from "framer-motion";

interface MeshBackgroundProps {
  variant?: "default" | "console";
}

export default function MeshBackground({ variant = "default" }: MeshBackgroundProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--bg)]">
      {/* Blueprint grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-80" />
      
      {/* Animated deep cosmic glows */}
      <motion.div 
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-violet/20 blur-[120px]" 
      />
      <motion.div 
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-brand-cyan/15 blur-[120px]" 
      />
      <motion.div 
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] rounded-full bg-brand-blue/20 blur-[120px]" 
      />
    </div>
  );
}
