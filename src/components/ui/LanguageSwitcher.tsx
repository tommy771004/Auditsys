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
        className="inline-flex min-h-[44px] items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text)] transition hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] hover:translate-x-[2px]"
        onClick={() => {
          setIsOpen((currentValue) => !currentValue);
        }}
        aria-label={t("languageSwitcher.toggleAriaLabel")}
        aria-expanded={isOpen}
      >
        <Languages className="h-4 w-4 text-[var(--text)]" />
        <span>{t(currentOption.shortLabelKey)}</span>
        <ChevronDown className={["h-4 w-4 text-[var(--text)] transition-transform", isOpen ? "rotate-180" : ""].filter(Boolean).join(" ")} />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-[calc(100%+0.75rem)] z-50 min-w-[12rem] rounded-sm border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[4px_4px_0_rgba(0,0,0,1)]"
          >
            <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.24em] text-brand-muted">{t("languageSwitcher.menuLabel")}</p>
            <div className="space-y-1">
              {languageOptions.map((option) => {
                const isActive = option.code === activeLanguage;

                return (
                  <button
                    key={option.code}
                    type="button"
                    className={[
                      "flex min-h-[44px] w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none",
                      isActive ? "bg-black text-white" : "text-[var(--text)] hover:bg-black hover:text-white",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      void handleLanguageChange(option.code);
                    }}
                  >
                    <span>{t(option.labelKey)}</span>
                    {isActive ? <Check className="h-4 w-4 text-[var(--text)]" /> : null}
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
