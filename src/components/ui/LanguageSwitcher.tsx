import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LanguageOption, SupportedLocale } from "../../types/home";

const languageOptions: LanguageOption[] = [
  {
    code: "en",
    labelKey: "languageSwitcher.options.en",
    shortLabelKey: "languageSwitcher.shortOptions.en",
  },
  {
    code: "zh-TW",
    labelKey: "languageSwitcher.options.zh-TW",
    shortLabelKey: "languageSwitcher.shortOptions.zh-TW",
  },
];

function normalizeLanguage(language: string | undefined): SupportedLocale {
  if (!language) {
    return "en";
  }

  return language.startsWith("zh") ? "zh-TW" : "en";
}

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeLanguage, setActiveLanguage] = useState<SupportedLocale>(normalizeLanguage(i18n.resolvedLanguage));
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveLanguage(normalizeLanguage(i18n.resolvedLanguage));
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const currentOption = languageOptions.find((option) => option.code === activeLanguage) ?? languageOptions[0];

  const handleLanguageChange = async (language: SupportedLocale) => {
    setActiveLanguage(language);
    await i18n.changeLanguage(language);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none"
        onClick={() => {
          setIsOpen((currentValue) => !currentValue);
        }}
        aria-label={t("languageSwitcher.toggleAriaLabel")}
        aria-expanded={isOpen}
      >
        <Languages className="h-4 w-4 text-brand-cyan" />
        <span>{t(currentOption.shortLabelKey)}</span>
        <ChevronDown className={["h-4 w-4 transition-transform", isOpen ? "rotate-180" : ""].filter(Boolean).join(" ")} />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="glass-panel absolute right-0 top-[calc(100%+0.75rem)] z-50 min-w-[12rem] rounded-3xl p-2"
          >
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-muted">{t("languageSwitcher.menuLabel")}</p>
            <div className="space-y-1">
              {languageOptions.map((option) => {
                const isActive = option.code === activeLanguage;

                return (
                  <button
                    key={option.code}
                    type="button"
                    className={[
                      "flex min-h-[44px] w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none",
                      isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.08] hover:text-white",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      void handleLanguageChange(option.code);
                    }}
                  >
                    <span>{t(option.labelKey)}</span>
                    {isActive ? <Check className="h-4 w-4 text-brand-cyan" /> : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
