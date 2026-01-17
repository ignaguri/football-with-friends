import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import translation files
import en from "../../../locales/en/common.json";
import es from "../../../locales/es/common.json";

const LANGUAGE_KEY = "user-language";

// Language detector plugin for AsyncStorage
const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }
    } catch (error) {
      console.log("Error reading language from storage:", error);
    }

    // Fall back to device locale
    const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "es";
    callback(deviceLocale.startsWith("es") ? "es" : "en");
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    } catch (error) {
      console.log("Error saving language to storage:", error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "es",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Helper to change language
export const changeLanguage = async (lng: "en" | "es") => {
  await i18n.changeLanguage(lng);
};

// Get current language
export const getCurrentLanguage = () => i18n.language as "en" | "es";
