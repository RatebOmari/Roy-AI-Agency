import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// The UI is English-only. AI-generated replies are not affected by this — they
// automatically match the language the customer wrote in (see the reply
// generation prompts in the backend).
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
