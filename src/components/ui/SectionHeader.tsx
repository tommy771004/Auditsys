import { motion } from "framer-motion";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export default function SectionHeader({ eyebrow, title, description, className, titleClassName, descriptionClassName }: SectionHeaderProps) {
  return (
    <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
      className={["space-y-4", className].filter(Boolean).join(" ")}
    >
      <motion.p 
        variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
        }}
        className="text-[11px] font-mono font-bold uppercase tracking-[0.28em] text-black/50"
      >
        {eyebrow}
      </motion.p>
      <motion.h2 
        variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
        }}
        className={["text-[32px] font-black leading-[1.05] tracking-tight text-black lg:text-[44px] font-grotesk", titleClassName].filter(Boolean).join(" ")}
      >
        {title}
      </motion.h2>
      <motion.p 
        variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
        }}
        className={["text-base sm:text-[17px] leading-relaxed text-black/60 font-normal", descriptionClassName].filter(Boolean).join(" ")}
      >
        {description}
      </motion.p>
    </motion.div>
  );
}
