import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical } from "lucide-react";
import { haptics } from "../../utils/haptics";

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function ImageComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
}: ImageComparisonSliderProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isAtEdge, setIsAtEdge] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTickRef = useRef<number>(50);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    // 抓取時輕微震動回饋
    haptics.tap();
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    if (isDragging && !isAtEdge) {
      // 釋放時輕微震動回饋
      haptics.tap();
    }
    setIsDragging(false);
  };

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    
    // 限制範圍在 0 ~ 100%
    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;

    setPosition(percent);

    // --- 觸覺回饋 (Haptic Feedback) 邏輯 ---
    // 1. 邊界檢測 (Edge detection)
    if (percent <= 0 || percent >= 100) {
      if (!isAtEdge) {
        // 拉到底時：明顯的成功模式震動 (Success feel)
        haptics.success();
        setIsAtEdge(true);
      }
    } else {
      if (isAtEdge) setIsAtEdge(false);
      
      // 2. 刻度檢測 (Tick detection - 每 5% 觸發一次)
      if (Math.abs(percent - lastTickRef.current) >= 5) {
        // 極短促的喀喀聲震動，模擬實體旋鈕
        haptics.tick(); 
        // 將最後刻度更新至最近的 5% 倍數，保持手感一致性
        lastTickRef.current = Math.round(percent / 5) * 5;
      }
    }
  }, [isAtEdge]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isDragging) updatePosition(e.clientX);
    };
    const handleUp = () => {
      handlePointerUp();
    };

    if (isDragging) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    }

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={`relative w-full overflow-hidden rounded-2xl select-none touch-none bg-slate-900 ${className}`}
      style={{ aspectRatio: "16/9" }}
    >
      {/* After Image (Background) */}
      <img
        src={afterImage}
        alt="After"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      
      {/* After Label */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <span className="rounded-full bg-black/50 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white/90 border border-white/10 shadow-lg">
          {afterLabel}
        </span>
      </div>

      {/* Before Image (Foreground, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{ width: containerRef.current?.offsetWidth || "100%" }}
          draggable={false}
        />
        {/* Before Label */}
        <div className="absolute top-4 left-4 z-10">
          <span className="rounded-full bg-black/50 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white/90 border border-white/10 shadow-lg">
            {beforeLabel}
          </span>
        </div>
      </div>

      {/* Slider Handle */}
      <motion.div
        className="absolute inset-y-0 z-20 flex items-center justify-center -ml-[2px]"
        style={{ left: `${position}%` }}
        animate={{
          scale: isDragging ? 1.02 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Center line */}
        <div className={`w-[4px] h-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-colors duration-300 ${isAtEdge ? 'bg-emerald-400' : 'bg-white'}`} />
        
        {/* Handle Button */}
        <div className="absolute">
          <AnimatePresence>
            <motion.div
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: isAtEdge ? 1.15 : (isDragging ? 1.1 : 1), 
                opacity: 1,
                boxShadow: isAtEdge 
                  ? "0 0 25px rgba(52,211,153,0.7)" 
                  : isDragging 
                    ? "0 0 20px rgba(255,255,255,0.4)" 
                    : "0 0 10px rgba(0,0,0,0.3)"
              }}
              className={`flex h-10 w-10 cursor-grab items-center justify-center rounded-full border-2 backdrop-blur-xl transition-colors duration-300 ${
                isDragging ? "cursor-grabbing" : ""
              } ${
                isAtEdge 
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100" 
                  : "border-white/50 bg-white/10 text-white"
              }`}
            >
              <GripVertical className="h-5 w-5 opacity-80 pointer-events-none" />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Edge Hit Overlay (Visual Feedback) */}
      <AnimatePresence>
        {isAtEdge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 pointer-events-none border-4 transition-colors duration-300 ${position === 0 ? "border-l-emerald-400" : "border-r-emerald-400"} border-transparent z-30`}
          >
            <div className={`absolute inset-y-0 w-32 bg-gradient-to-r ${position === 0 ? "from-emerald-400/20 to-transparent left-0" : "from-transparent to-emerald-400/20 right-0"}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
