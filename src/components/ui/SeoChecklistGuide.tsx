import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Zap, Image, Search, ShieldCheck } from "lucide-react";
import SectionHeader from "./SectionHeader";
import ProgressBar from "./ProgressBar";

const steps = [
  {
    id: "step-1",
    title: "Optimize Metadata",
    description: "Ensure your title tags and meta descriptions are concise and keyword-rich to improve click-through rates from search results.",
    icon: Search,
  },
  {
    id: "step-2",
    title: "Improve Load Speed",
    description: "Minimise scripts and compress assets. A fast Largest Contentful Paint (LCP) is crucial for retaining users and ranking higher.",
    icon: Zap,
  },
  {
    id: "step-3",
    title: "Accessible Images",
    description: "Add descriptive alt attributes to all images. This assists screen readers and provides context to search engine crawlers.",
    icon: Image,
  },
  {
    id: "step-4",
    title: "Secure Your Site",
    description: "Always serve your content over HTTPS. Search engines penalize insecure sites, and users expect privacy.",
    icon: ShieldCheck,
  }
];

export default function SeoChecklistGuide() {
  const [activeStepId, setActiveStepId] = useState<string>(steps[0].id);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const toggleStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredSteps = steps.filter(step => {
    if (filter === 'completed') return completedSteps.has(step.id);
    if (filter === 'pending') return !completedSteps.has(step.id);
    return true;
  });

  const progress = Math.round((completedSteps.size / steps.length) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <SectionHeader 
        eyebrow="SEO CHECKLIST" 
        title="Step-by-Step Guide for Site Performance" 
        description="Follow these fundamental steps to optimize your site for speed, accessibility, and search presence." 
        className="text-center mb-8" 
      />

      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-black/5 rounded-md">
            {(['all', 'completed', 'pending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors capitalize ${
                  filter === f 
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" 
                    : "text-brand-muted hover:text-[var(--text)] hover:bg-black/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="text-sm font-bold text-brand-muted flex items-center gap-2">
            <span>{completedSteps.size} of {steps.length} Completed</span>
            <span className="inline-block px-2 py-0.5 rounded-full bg-black/10 text-[var(--text)]">{progress}%</span>
          </div>
        </div>
        
        <ProgressBar value={progress} height={8} className="bg-black/5" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredSteps.map((step, index) => {
              const isActive = activeStepId === step.id;
              const isCompleted = completedSteps.has(step.id);
              const Icon = step.icon;

              return (
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={step.id}
                  onClick={() => setActiveStepId(step.id)}
                  className={`w-full text-left flex items-start gap-4 p-5 rounded-sm border transition-all duration-300 relative ${
                    isActive
                      ? "border-[var(--border)] bg-black text-white shadow-[4px_4px_0_rgba(0,0,0,1)] -translate-y-1 -translate-x-1 z-10"
                      : isCompleted 
                        ? "border-[var(--border)] bg-black/5 text-brand-faint hover:bg-black/10"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-black/5"
                  }`}
                >
                  <button
                    onClick={(e) => toggleStep(step.id, e)}
                    aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isCompleted 
                        ? "bg-emerald-500 border-emerald-500 text-white" 
                        : isActive 
                          ? "border-white/50 hover:border-cyan-400 focus:border-cyan-400" 
                          : "border-[var(--border)] hover:border-[var(--border)] focus:border-[var(--border)]"
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1 relative">
                    <h4 className="font-bold text-lg relative inline-block">
                      <span className={isCompleted && !isActive ? "opacity-50" : ""}>{step.title}</span>
                      {/* Strikethrough Animation */}
                      <AnimatePresence>
                        {isCompleted && (
                          <motion.span
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            exit={{ scaleX: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className={`absolute left-0 top-1/2 h-[2px] w-full origin-left -translate-y-1/2 ${
                              isActive ? "bg-cyan-400" : "bg-black"
                            }`}
                          />
                        )}
                      </AnimatePresence>
                    </h4>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className={`mt-2 text-sm leading-relaxed ${isActive ? "text-white/80" : "text-brand-muted"}`}>
                            {step.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className={`flex items-center justify-center h-full transition-transform ${isActive ? "rotate-90 text-cyan-400" : "text-brand-faint"}`}>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </motion.button>
              );
            })}
            {filteredSteps.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center border border-dashed border-[var(--border)] rounded-sm text-brand-faint"
              >
                No tasks found in this view.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="hidden md:flex bg-[var(--surface)] border border-[var(--border)] p-8 rounded-sm shadow-[4px_4px_0_rgba(0,0,0,1)] items-center justify-center text-center">
             <AnimatePresence mode="wait">
               {steps.map((step) => 
                 step.id === activeStepId ? (
                   <motion.div
                     key={step.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     transition={{ duration: 0.2 }}
                     className="space-y-6 flex flex-col items-center"
                   >
                     <div className="w-24 h-24 rounded-full bg-black/5 flex items-center justify-center text-[var(--text)] relative">
                       <step.icon className="w-10 h-10" />
                       <AnimatePresence>
                         {completedSteps.has(step.id) && (
                           <motion.div
                             initial={{ scale: 0, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             exit={{ scale: 0, opacity: 0 }}
                             className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1"
                           >
                              <CheckCircle2 className="w-6 h-6" />
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                     <div className="space-y-3">
                       <h3 className="text-2xl font-black relative inline-block">
                          <span className={completedSteps.has(step.id) ? "opacity-50" : ""}>{step.title}</span>
                          <AnimatePresence>
                            {completedSteps.has(step.id) && (
                              <motion.span
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                exit={{ scaleX: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="absolute left-0 top-1/2 h-[3px] w-full origin-left bg-black -translate-y-1/2"
                              />
                            )}
                          </AnimatePresence>
                       </h3>
                       <p className="text-brand-muted text-sm max-w-sm">
                         {step.description}
                       </p>
                     </div>
                     <div className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 justify-center mr-1.5" /> Best Practice
                     </div>
                   </motion.div>
                 ) : null
               )}
             </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
