import { motion } from "framer-motion";

interface MeshBackgroundProps {
  variant?: "default" | "console";
}

export default function MeshBackground({ variant = "default" }: MeshBackgroundProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-white">
      {/* Relume style precise coordinate blueprint grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-80" />
      {/* Subtle top-down high contrast focus */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.035),transparent_65%)]" />
    </div>
  );
}
