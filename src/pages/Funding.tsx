import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Rocket, Cpu, Layers } from "lucide-react";
import type { NavigateTo } from "../types/home";

interface FundingProps {
  onNavigate: NavigateTo;
}

export default function Funding({ onNavigate }: FundingProps) {
  return (
    <div className="min-h-screen bg-[var(--surface)] p-4 sm:p-6 lg:p-8 font-sans text-brand-text flex items-center justify-center">
      
      {/* Background ambient mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vh] bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Main Grid Container */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 auto-rows-min h-full">
        
        {/* Navigation - Spans all 12 columns */}
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="col-span-1 lg:col-span-12 rounded-sm lg:rounded-sm bg-black/5 backdrop-blur-2xl border border-[var(--border)] p-4 sm:p-6 flex items-center justify-between group hover:bg-black/10 hover:border-[var(--border)] transition-all duration-200 ease-out hover:shadow-[0_8px_32px_rgba(255,255,255,0.02)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-lg">
              <Layers className="w-5 h-5 text-[var(--text)]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--text)]">v41 Studio.</span>
          </div>
          
          <ul className="hidden md:flex items-center gap-8 px-8 py-2 rounded-full bg-black/20 border border-[var(--border)]">
            <li><a href="#" className="text-sm font-medium text-[var(--text)] hover:text-cyan-400 transition-colors">Manifesto</a></li>
            <li><a href="#" className="text-sm font-medium text-brand-muted hover:text-[var(--text)] transition-colors">Portfolio</a></li>
            <li><a href="#" className="text-sm font-medium text-brand-muted hover:text-[var(--text)] transition-colors">Network</a></li>
          </ul>

          <div className="flex gap-4 items-center">
            <button 
              onClick={() => onNavigate("home")} 
              className="text-sm font-semibold text-brand-muted hover:text-[var(--text)] transition-all px-4 py-2"
            >
              Back to AuditLens
            </button>
            <button className="hidden sm:flex text-sm font-bold items-center gap-2 px-6 py-3 rounded-full bg-[var(--surface)] text-[var(--text)] hover:scale-105 hover:bg-cyan-50 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Apply Now <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </motion.nav>

        {/* Left Module: v41 Apply for Funding */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          className="col-span-1 lg:col-span-7 flex flex-col relative rounded-sm lg:rounded-sm overflow-hidden group border border-[var(--border)] bg-[var(--surface)] shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all duration-200 ease-out min-h-[500px]"
        >
          
          <div className="p-8 sm:p-12 lg:p-16 flex flex-col h-full z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-[var(--border)] group-hover:border-white bg-black/5 group-hover:bg-white/10 w-max mb-8">
              <Sparkles className="w-4 h-4 text-[var(--text)] group-hover:text-white" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text)] group-hover:text-white">Cohort v41 Open</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              Forge the Future.<br/>
              Apply for Funding.
            </h1>
            
            <p className="text-lg sm:text-xl text-brand-muted group-hover:text-white/80 transition-colors duration-200 leading-relaxed max-w-xl font-medium">
              We back resilient founders building category-defining software. Up to $500K in pre-seed funding, architectural deep-audits, and a network of technical titans.
            </p>

            <div className="mt-auto pt-12 flex items-center justify-between">
               <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className={`w-12 h-12 rounded-full border-2 border-[#121622] bg-gradient-to-br from-indigo-${200*i} to-cyan-400`}></div>
                 ))}
               </div>
               <button className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface)] text-[var(--text)] group-hover:scale-110 group-hover:bg-cyan-400 group-hover:text-[var(--text)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all duration-200 ease-out">
                 <ArrowUpRight className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
               </button>
            </div>
          </div>
        </motion.div>

        {/* Right Panel Wrapper (Takes up 5 cols, holds 2 square/horizontal modules) */}
        <div className="col-span-1 lg:col-span-5 grid grid-rows-2 gap-5 sm:gap-6 lg:gap-8">
          
          {/* Top Right: Incubation & Acceleration Program */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut", scale: { type: "spring", stiffness: 400, damping: 25 } }}
            className="rounded-sm lg:rounded-sm overflow-hidden relative group border border-[var(--border)] bg-black/5 backdrop-blur-3xl hover:bg-black/10 transition-colors duration-200 ease-out hover:border-purple-500/30 flex flex-col justify-between min-h-[250px]"
          >
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 blur-[60px] group-hover:bg-purple-500/20 transition-colors duration-200 ease-out pointer-events-none" />
            
            <div className="p-8 sm:p-10 z-10 flex flex-col h-full">
              <div className="w-12 h-12 rounded-sm bg-black/5 border border-[var(--border)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-200 ease-out">
                <Rocket className="w-6 h-6 text-purple-400" />
              </div>
              
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-[var(--text)] mb-3">Incubation &<br/>Acceleration Program</h2>
              <p className="text-sm sm:text-base text-brand-faint leading-relaxed font-medium">
                12-week intensive scale program focused on go-to-market and high-performance architecture.
              </p>
            </div>
          </motion.div>

          {/* Bottom Right: Platform Capabilities / Stats */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="grid grid-cols-2 gap-5 sm:gap-6 lg:gap-8 min-h-[200px]"
          >
            {/* Sub Module 1 */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="rounded-sm lg:rounded-sm bg-black/5 border border-[var(--border)] backdrop-blur-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-black/10 transition-colors duration-200 ease-out"
            >
              <div className="text-4xl font-bold text-[var(--text)] mb-2 tracking-tighter">$1B+</div>
              <div className="text-xs font-semibold uppercase tracking-widest text-brand-faint">Value Created</div>
            </motion.div>

            {/* Sub Module 2 */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="rounded-sm lg:rounded-sm bg-gradient-to-br from-cyan-400/20 to-transparent border border-cyan-400/30 backdrop-blur-2xl p-6 sm:p-8 flex flex-col items-start justify-between group hover:border-cyan-400/60 transition-colors duration-200 ease-out overflow-hidden relative"
            >
              <Cpu className="w-6 h-6 text-cyan-300 absolute top-6 right-6 opacity-30 group-hover:scale-150 group-hover:rotate-90 group-hover:opacity-10 transition-all duration-200 ease-out" />
              <div className="text-sm font-bold text-cyan-100 z-10 w-full">Core Tech<br/>Review Module</div>
              <div className="w-10 h-10 rounded-full bg-cyan-400/20 flex items-center justify-center mt-6 z-10 backdrop-blur-md border border-cyan-300/30">
                 <ArrowUpRight className="w-5 h-5 text-cyan-300" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
