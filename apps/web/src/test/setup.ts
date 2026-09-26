import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach } from "vitest";

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
server.listen({ onUnhandledRequest: "error" });

afterEach(() => {
  useShellStore.getState().clear();
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
