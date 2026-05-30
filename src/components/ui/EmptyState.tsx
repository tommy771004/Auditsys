import React from 'react';
import { motion } from 'framer-motion';
import { FilePlus2 } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon = <FilePlus2 className="w-12 h-12" />, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-[24px] border border-dashed border-white/10 bg-slate-950/30"
    >
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/5 text-white/40 mb-6 shadow-inner">
        {icon}
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      
      <p className="max-w-md text-sm leading-relaxed text-brand-muted mb-8">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white transition-all rounded-full bg-brand-cyan hover:bg-brand-cyan/90 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
