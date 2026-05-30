import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

interface AIPromptInputProps {
  onSubmit?: (prompt: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * AIPromptInput
 * 
 * 1. 打字光暈 (Typing Glow): 輸入框 focus 且有文字時，外圍呈現動態漸層光暈 (Gradient glow)。
 * 2. 動態長高 (Auto-grow): Textarea 隨文字行數自動長高，最高 200px 後內部捲動。
 * 3. 行動端適應 (Mobile Viewport): 建議外層容器使用 `min-h-[100dvh]` 確保虛擬鍵盤不遮擋。
 */
export default function AIPromptInput({
  onSubmit,
  value: controlledValue,
  onChange,
  placeholder = "Ask AI to analyze...",
  className = "",
}: AIPromptInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化與內容改變時更新 textarea 高度 (Auto-grow)
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // 設定最大高度為 200px，超過則啟用內部 scroll
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 支援 Shift+Enter 換行，Enter 送出
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit?.(value.trim());
      if (controlledValue === undefined) {
        setInternalValue("");
      }
      // 提交後高度重置交由 useEffect 處理
    }
  };

  const isTyping = isFocused && value.length > 0;

  return (
    <div className={`relative w-full max-w-3xl mx-auto ${className}`}>
      {/* 動態漸層光暈效果 (Gradient Glow) */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute -inset-[2px] rounded-[26px] z-0 blur-lg pointer-events-none"
            style={{
              background: "linear-gradient(90deg, rgba(6,182,212,0.5), rgba(139,92,246,0.5), rgba(6,182,212,0.5))",
              backgroundSize: "200% 200%",
              animation: "gradientFlow 3s ease infinite",
            }}
          />
        )}
      </AnimatePresence>

      {/* 輸入框主體 Container */}
      <div 
        className={`relative z-10 flex items-end gap-2 p-2 rounded-[24px] border transition-colors duration-500 bg-slate-950/80 backdrop-blur-2xl ${
          isFocused ? "border-brand-cyan/40 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 max-h-[200px] min-h-[44px] bg-transparent text-white placeholder-brand-muted text-base px-4 py-3 outline-none resize-none overflow-y-auto"
          style={{ lineHeight: "1.5" }}
        />
        
        {/* 送出按鈕 */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className={`shrink-0 h-11 w-11 flex items-center justify-center rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            value.trim() 
              ? "bg-brand-gradient text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] cursor-pointer hover:scale-105 active:scale-95" 
              : "bg-white/5 text-white/30 cursor-not-allowed"
          }`}
        >
          <Send className="w-5 h-5 ml-1" />
        </button>
      </div>

      <style>{`
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
