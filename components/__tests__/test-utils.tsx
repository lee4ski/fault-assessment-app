// Shared render helper for component tests: wraps every rendered tree in
// LocaleProvider, since components now call useLocale() and throw if it's
// missing. Import `render`/`screen`/etc. from this file instead of
// "@testing-library/react" directly in any test that renders a component
// using useLocale().
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import { LocaleProvider } from "../LocaleProvider";

export function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: LocaleProvider, ...options });
}

export * from "@testing-library/react";
