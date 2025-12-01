import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

export type Locale = "ja" | "en";

export const messages = {
  ja,
  en,
};

export function getTranslations(locale: Locale = "ja") {
  return (key: string, params?: Record<string, string | number>) => {
    const keys = key.split(".");
    let value: any = messages[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== "string") {
      return key;
    }

    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) =>
          str.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
        value
      );
    }

    return value;
  };
}

