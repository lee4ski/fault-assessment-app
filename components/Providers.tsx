"use client";

import { ReactNode } from "react";
import { LocaleProvider } from "./LocaleProvider";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <LanguageSwitcher />
      {children}
    </LocaleProvider>
  );
}
