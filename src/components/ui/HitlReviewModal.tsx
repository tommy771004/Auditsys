import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, CheckCircle, MessageSquare, FastForward } from "lucide-react";
import SolidButton from "./SolidButton";
import { useTranslation } from "react-i18next";

interface HitlReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onInjectFeedback: (feedback: string) => void;
  reason?: string;
}

export function HitlReviewModal({
  isOpen,
  onClose,
  onApprove,
  onInjectFeedback,
  reason,
}: HitlReviewModalProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.resolvedLanguage === "zh-TW" || i18n.language === "zh-TW";
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleInject = () => {
    if (feedback.trim()) {
      onInjectFeedback(feedback);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <motion.div
            className="absolute inset-0 bg-[var(--surface)] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-sm border border-amber-500/30 bg-neutral-100 shadow-[0_0_60px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/10"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50" />
            
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-6 py-5.5 backdrop-blur-xl shadow-inner">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-amber-400/30 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                  <ShieldAlert className="h-6 w-6 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-amber-50 drop-shadow-sm">
                    {isZh ? "需要人工審核 (Human-in-the-Loop)" : "Manual Review Required"}
                  </h3>
                  <p className="text-sm font-medium text-amber-200/80 mt-0.5">
                    {isZh ? "發現警告或潛在異常，請確認當前結果或注入指導。" : "Warnings or anomalies detected. Please review findings or guide the agent."}
                  </p>
                </div>
              </div>
              <button
                className="group rounded-full p-2.5 text-brand-faint transition-all duration-300 hover:bg-black/10 hover:text-[var(--text)]"
                onClick={onClose}
              >
                <X className="h-5 w-5 transition-transform group-hover:scale-110" />
              </button>
            </div>

            {/* Body */}
            <div className="relative p-6 px-7 z-10 bg-neutral-100/40">
              {reason && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 rounded-sm border border-amber-500/20 bg-amber-500/10 p-4.5 text-sm leading-relaxed text-amber-100/90 shadow-inner shadow-black/20 animate-pulse"
                >
                  <span className="font-bold tracking-wide uppercase text-[10px] text-amber-300/80 block mb-1.5 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">{isZh ? "攔截原因 (Intercept Reason)" : "Intercept Reason"}</span>
                  <div className="font-medium">{reason}</div>
                </motion.div>
              )}

              <div className="space-y-3.5 group/textarea">
                <label className="text-sm font-semibold text-brand-muted flex items-center gap-2 transition-colors group-focus-within/textarea:text-cyan-300 ml-1">
                  <MessageSquare className="h-4.5 w-4.5" />
                  {isZh ? "注入反饋與指導 (Inject Feedback)" : "Provide Feedback (Optional)"}
                </label>
                <div className="relative shadow-inner shadow-black/40 rounded-sm overflow-hidden bg-[var(--surface)] border border-[var(--border)] transition-colors duration-300 group-focus-within/textarea:border-cyan-500/50 group-focus-within/textarea:bg-[var(--surface)]">
                  <textarea
                    ref={inputRef}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={
                      isZh
                        ? "輸入指導指示（例如：忽略效能警告，或是請專注於無障礙測試的結果）"
                        : "Enter feedback (e.g., 'Ignore performance warnings' or 'Focus strictly on a11y parameters')"
                    }
                    className="w-full min-h-[140px] resize-none bg-transparent p-4 text-sm leading-relaxed text-[var(--text)] placeholder-white/30 outline-none"
                  />
                  {/* Subtle inner glow when focused */}
                  <div className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-transparent transition-all duration-300 group-focus-within/textarea:ring-cyan-500/20 group-focus-within/textarea:shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-end gap-3.5 border-t border-[var(--border)] bg-[var(--surface)] px-7 py-5">
              <SolidButton
                variant="ghost"
                onClick={() => {
                  onApprove();
                  onClose();
                }}
                className="!text-emerald-400 hover:!bg-emerald-400/10 hover:!text-emerald-300 !px-5"
                loadingLabel=""
              >
                <CheckCircle className="h-4.5 w-4.5 mr-2 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="font-semibold tracking-wide">{isZh ? "核准並接納" : "Approve Current"}</span>
              </SolidButton>
              <SolidButton
                onClick={handleInject}
                className="!bg-amber-500/20 !border-amber-500/40 hover:!bg-amber-500/30 !text-amber-100 !px-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                loadingLabel=""
              >
                <FastForward className="h-4.5 w-4.5 mr-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                <span className="font-semibold tracking-wide">{isZh ? "注入反饋並重試" : "Inject & Retry"}</span>
              </SolidButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
