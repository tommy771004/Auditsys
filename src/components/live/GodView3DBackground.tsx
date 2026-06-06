import React from "react";
import { motion } from "framer-motion";

export default function GodView3DBackground() {
  // Let's create some drifting isometric elements (desks, nodes, data packets)
  const items = [
    { id: 1, type: "node", x: "12%", y: "25%", delay: 0, scale: 0.8 },
    { id: 2, type: "desk", x: "85%", y: "15%", delay: 3, scale: 0.9 },
    { id: 3, type: "rack", x: "78%", y: "70%", delay: 1.5, scale: 0.75 },
    { id: 4, type: "data", x: "20%", y: "80%", delay: 4, scale: 1.1 },
    { id: 5, type: "node", x: "50%", y: "85%", delay: 2.2, scale: 0.7 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 3D Perspective Plane Wrapper */}
      <div 
        className="absolute inset-0"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Animated Infinite 3D Grid Floor */}
        <motion.div 
          animate={{
            backgroundPositionY: ["0px", "64px"],
          }}
          transition={{
            duration: 8,
            ease: "linear",
            repeat: Infinity,
          }}
          className="absolute inset-0 origin-bottom"
          style={{
            transform: "rotateX(68deg) translateY(-30%) scale(1.6)",
            transformStyle: "preserve-3d",
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />

        {/* Dynamic Holographic Scanner Bar sweeping the 3D grid */}
        <motion.div
          animate={{
            translateY: ["-300px", "600px"],
            opacity: [0, 0.4, 0.4, 0],
          }}
          transition={{
            duration: 10,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent shadow-[0_0_20px_9px_rgba(6,182,212,0.06)]"
          style={{
            transform: "rotateX(68deg) translateY(-20%) scale(1.6)",
          }}
        />
      </div>

      {/* Isometric Blueprint Floating Coordinates (e.g. [X, Y, Z] simulation) */}
      <div className="absolute inset-0 opacity-25">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0.15, y: 15 }}
            animate={{
              opacity: [0.15, 0.4, 0.15],
              y: [15, -15, 15],
            }}
            transition={{
              duration: 6 + item.delay * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            }}
            className="absolute z-10 font-mono text-[9px] text-zinc-500/80 border border-zinc-300 p-2 rounded-sm bg-white/40 backdrop-blur-[1px]"
            style={{
              left: item.x,
              top: item.y,
              transform: "rotateX(20deg) rotateY(-5deg) scale(0.9)",
              boxShadow: "2px 2px 0px rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-1.5 border-b border-zinc-200/60 pb-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
              <span className="font-bold text-zinc-700">SYS_COR_{item.id}</span>
            </div>
            {item.type === "desk" && (
              <div className="space-y-0.5">
                <p>STATUS: AGENT_DESK</p>
                <p>WORK_STATE: LIVE</p>
              </div>
            )}
            {item.type === "node" && (
              <div className="space-y-0.5">
                <p>TARGET: AUDIT_ROUTER</p>
                <p>P_ROUTE: OK</p>
              </div>
            )}
            {item.type === "rack" && (
              <div className="space-y-0.5">
                <p>CABINET: MAIN_75</p>
                <p>SYNC: SYNC_PORT_32</p>
              </div>
            )}
            {item.type === "data" && (
              <div className="space-y-0.5">
                <p>PACKET: TWO_RETRY_EXEC</p>
                <p>FPS: 60_HZ</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Cybernetic Grid Corner Angle Accents */}
      <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-black/10" />
      <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-black/10" />
      <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-black/10" />
      <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-black/10" />
    </div>
  );
}
