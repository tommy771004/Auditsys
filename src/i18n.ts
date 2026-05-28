import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";
import type { SupportedLocale } from "./types/home";

const supportedLanguages: SupportedLocale[] = ["en", "zh-TW"];

function detectLanguage(): SupportedLocale {
  const browserLanguage = window.navigator.language.toLowerCase();

  if (browserLanguage.includes("zh-tw") || browserLanguage.includes("zh-hk")) {
    return "zh-TW";
  }

  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
    "zh-TW": {
      translation: zhTW,
    },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
