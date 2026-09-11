import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
// Registers jest-dom's matchers with Vitest's `expect` AND augments
// Vitest's `Assertion<T>` type so TypeScript recognizes them (e.g.
// `toBeInTheDocument`) wherever `expect()` is used in test files. The
// previous `@testing-library/jest-dom/matchers` + `expect.extend()`
// approach registered the matchers at runtime but never told TypeScript
// about them — harmless for `vitest run`, but `next build`'s own
// TypeScript check (which type-checks every `.tsx` under this project,
// tests included) flags every matcher use as a type error.
import "@testing-library/jest-dom/vitest";

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

// Cleanup after each test
afterEach(() => {
  cleanup();
});

