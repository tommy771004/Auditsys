import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastInput = Omit<ToastOptions, 'id'>;

let listener: ((toast: ToastOptions) => void) | null = null;
let removeListener: ((id: string) => void) | null = null;

export const toast = {
  show: (options: ToastInput) => {
    if (listener) {
      const id = Math.random().toString(36).substr(2, 9);
      listener({ ...options, id });
    }
  },
  success: (message: string, duration?: number) => toast.show({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => toast.show({ message, type: 'error', duration }),
  info: (message: string, duration?: number) => toast.show({ message, type: 'info', duration }),
  dismiss: (id: string) => {
    if (removeListener) removeListener(id);
  }
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  useEffect(() => {
    listener = (newToast: ToastOptions) => {
      setToasts((prev) => [...prev, newToast]);
      if (newToast.duration !== Infinity) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration || 3000);
      }
    };

    removeListener = (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return () => {
      listener = null;
      removeListener = null;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 rounded-md px-4 py-3 shadow-[4px_4px_0_rgba(0,0,0,1)] border border-[var(--border)] min-w-[300px] max-w-md ${
              t.type === 'error' ? 'bg-rose-50 text-rose-900 border-rose-200' :
              t.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
              'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
            
            <p className="text-sm font-medium flex-1">{t.message}</p>
            
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-slate-400 hover:text-[var(--text)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
