import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";

export function NetworkBanner() {
  const isOffline = useNetworkStatus();
  const { t, i18n } = useTranslation();
  const isZh = i18n.resolvedLanguage === "zh-TW" || i18n.language === "zh-TW";

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center bg-rose-500 text-white px-4 py-2 shadow-md gap-2"
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isZh ? "您目前處於離線狀態，部分功能可能無法使用。" : "You are currently offline. Some features may be unavailable."}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
