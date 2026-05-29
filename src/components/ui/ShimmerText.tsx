import { motion } from "framer-motion";

interface ShimmerTextProps {
  text: string;
  className?: string;
}

export default function ShimmerText({ text, className = "" }: ShimmerTextProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <motion.div
        className="font-medium text-transparent bg-clip-text select-none"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.3) 100%)",
          backgroundSize: "200% 100%",
          // Webkit prefix required for text clipping in many browsers
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
        animate={{ backgroundPosition: ["200% center", "-200% center"] }}
        transition={{ 
          repeat: Infinity, 
          duration: 2.5, 
          ease: "linear" 
        }}
      >
        {text}
      </motion.div>
    </div>
  );
}
