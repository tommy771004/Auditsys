// Accordion.tsx with Relume architectural blueprint guidelines (Micro Borders, Monochromatic precise alignment)
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  title: string | React.ReactNode;
  content: string | React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
  glowColor?: "purple" | "cyan" | "blue" | "none";
}

export default function Accordion({
  items,
  allowMultiple = false,
  className = "",
}: AccordionProps) {
  const [activeIds, setActiveIds] = useState<string[]>([]);

  const handleToggle = (id: string) => {
    if (allowMultiple) {
      setActiveIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setActiveIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, index) => {
        const isOpen = activeIds.includes(item.id);

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            className={`overflow-hidden rounded-sm border transition-all duration-300 shadow-none ${
              isOpen
                ? "border-black bg-white"
                : "border-black bg-white hover:border-black/15"
            }`}
          >
            {/* Accordion Trigger Header */}
            <button
              type="button"
              onClick={() => handleToggle(item.id)}
              className="flex w-full items-center justify-between px-6 py-4.5 text-left outline-none transition-colors duration-300 group"
            >
              <span
                className={`text-sm sm:text-base font-bold leading-relaxed tracking-tight transition-colors duration-300 ${
                  isOpen ? "text-black" : "text-black/80 group-hover:text-black"
                }`}
              >
                {item.title}
              </span>
              <span
                className={`ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border transition-all duration-200 ease-out ${
                  isOpen
                    ? "border-black bg-black text-white rotate-180"
                    : "border-black bg-white text-black group-hover:bg-black group-hover:text-white group-hover:shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none translate-y-0 group-hover:translate-y-[2px] group-hover:translate-x-[2px]"
                }`}
              >
                <ChevronDown className="h-4 w-4 transition-transform duration-300" />
              </span>
            </button>

            {/* Accordion Content Panel */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: {
                      height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.2, delay: 0.05 },
                    },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: {
                      height: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.15 },
                    },
                  }}
                  className="border-t border-black/[0.06] bg-white"
                >
                  <div className="px-6 py-4 text-xs sm:text-sm leading-relaxed text-black/60 max-w-none">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
