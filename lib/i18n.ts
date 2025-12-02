import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

export const messages = {
  ja,
  en,
};

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: messages[locale as Locale],
  };
});

