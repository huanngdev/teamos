import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach } from "vitest";

// GitHub-hosted runners share the machine with the rest of `bun run check`.
// A 300 ms search debounce plus a refetch can miss the 1 s Testing Library default.
configure({ asyncUtilTimeout: 5_000 });

import { useShellStore } from "@/shared/stores/shell-store";
import { server } from "./server";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    addEventListener() {},
    addListener() {},
    dispatchEvent() {
      return false;
    },
    matches: false,
    media: query,
    onchange: null,
    removeEventListener() {},
    removeListener() {},
  }),
  writable: true,
});

Object.defineProperty(window, "requestAnimationFrame", {
  configurable: true,
  value: (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  writable: true,
});

if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [];
}

Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  value: class ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
  writable: true,
});

Object.defineProperty(window, "IntersectionObserver", {
  configurable: true,
  value: class IntersectionObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
  writable: true,
});

Object.defineProperty(window, "cancelAnimationFrame", {
  configurable: true,
  value: (handle: number) => window.clearTimeout(handle),
  writable: true,
});

/*
 * Listening starts while setup runs, before test modules are imported. The
 * Better Auth client captures `fetch` when it is created, so a client imported
 * by a test module would otherwise hold the unpatched implementation.
 */
server.listen({ onUnhandledFrame: "error" });

afterEach(() => {
  useShellStore.getState().clear();
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
