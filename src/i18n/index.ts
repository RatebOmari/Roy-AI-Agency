import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import es from "./locales/es.json";

const saved = localStorage.getItem("sp-lang") || "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar }, es: { translation: es } },
  lng: saved,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
