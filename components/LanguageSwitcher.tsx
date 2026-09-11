"use client";

import { useLocale } from "./LocaleProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="fixed top-3 right-3 z-50 flex items-center bg-white border border-gray-200 rounded-full shadow-md p-1"
      role="group"
      aria-label="Language switcher"
    >
      <button
        onClick={() => setLocale("ja")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          locale === "ja"
            ? "bg-blue-600 text-white"
            : "text-gray-500 hover:text-gray-800"
        }`}
        aria-pressed={locale === "ja"}
      >
        日本語
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          locale === "en"
            ? "bg-blue-600 text-white"
            : "text-gray-500 hover:text-gray-800"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
