import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Zap, Image, Search, ShieldCheck } from "lucide-react";
import SectionHeader from "./SectionHeader";

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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <SectionHeader 
        eyebrow="SEO CHECKLIST" 
        title="Step-by-Step Guide for Site Performance" 
        description="Follow these fundamental steps to optimize your site for speed, accessibility, and search presence." 
        className="text-center mb-12" 
      />

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = activeStepId === step.id;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className={`w-full text-left flex items-start gap-4 p-5 rounded-sm border transition-all duration-300 ${
                  isActive
                    ? "border-black bg-black text-white shadow-[4px_4px_0_rgba(0,0,0,1)] -translate-y-1 -translate-x-1"
                    : "border-black bg-white text-black hover:bg-black/5"
                }`}
              >
                <div className={`mt-1 flex-shrink-0 ${isActive ? "text-cyan-400" : "text-black/50"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{step.title}</h4>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className={`mt-2 text-sm leading-relaxed ${isActive ? "text-white/80" : "text-black/60"}`}>
                          {step.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className={`flex items-center justify-center h-full transition-transform ${isActive ? "rotate-90 text-cyan-400" : "text-black/30"}`}>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="hidden md:flex bg-white border border-black p-8 rounded-sm shadow-[4px_4px_0_rgba(0,0,0,1)] items-center justify-center text-center">
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
                     <div className="w-24 h-24 rounded-full bg-black/5 flex items-center justify-center text-black">
                       <step.icon className="w-10 h-10" />
                     </div>
                     <div className="space-y-3">
                       <h3 className="text-2xl font-black">{step.title}</h3>
                       <p className="text-black/60 text-sm max-w-sm">
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
