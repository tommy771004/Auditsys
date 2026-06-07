import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Command, Activity, Terminal, CheckCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function CommandPalette({ onNavigate }: { onNavigate: (route: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { t, i18n } = useTranslation();
  const isZh = i18n.resolvedLanguage === "zh-TW" || i18n.language === "zh-TW";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const actions = [
    {
      id: "home",
      title: isZh ? "首頁" : "Home",
      icon: Search,
      onSelect: () => onNavigate("home")
    },
    {
      id: "console",
      title: isZh ? "智慧審查控制台" : "Audit Console",
      icon: Terminal,
      onSelect: () => onNavigate("console")
    },
    {
      id: "live",
      title: isZh ? "即時效能監控" : "Live Real-time Dashboard",
      icon: Activity,
      onSelect: () => onNavigate("live")
    },
    {
      id: "pricing",
      title: isZh ? "定價與方案" : "Pricing",
      icon: CheckCircle,
      onSelect: () => onNavigate("pricing")
    }
  ];

  const filteredActions = actions.filter((action) =>
    action.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            className="fixed top-1/2 left-1/2 z-[101] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border border-neutral-200 bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isZh ? "搜尋或輸入指令..." : "Type a command or search..."}
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
              <div className="flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredActions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-500">
                  {isZh ? "找不到相關指令。" : "No results found."}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredActions.map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        autoFocus={i === 0}
                        onClick={() => {
                          action.onSelect();
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-[var(--text)] focus:bg-neutral-100 focus:text-[var(--text)] focus:outline-none"
                      >
                        <Icon className="h-4 w-4 text-neutral-400" />
                        {action.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
