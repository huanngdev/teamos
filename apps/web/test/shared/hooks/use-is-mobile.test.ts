import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { useIsMobile } from "@/shared/hooks/use-mobile";

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  let matches = initialMatches;
  const query = {
    get matches() {
      return matches;
    },
    addEventListener: (_event: "change", listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_event: "change", listener: () => void) => {
      listeners.delete(listener);
    },
  };

  vi.stubGlobal("matchMedia", () => query);

  return {
    change(next: boolean) {
      matches = next;
      for (const listener of listeners) {
        listener();
      }
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("reads the current viewport from matchMedia", () => {
  stubMatchMedia(true);

  const { result } = renderHook(() => useIsMobile());

  expect(result.current).toBe(true);
});

test("updates when the media query changes and unsubscribes on unmount", () => {
  const media = stubMatchMedia(false);
  const { result, unmount } = renderHook(() => useIsMobile());

  expect(result.current).toBe(false);

  act(() => {
    media.change(true);
  });
  expect(result.current).toBe(true);
  expect(media.listenerCount()).toBe(1);

  unmount();
  expect(media.listenerCount()).toBe(0);
});
