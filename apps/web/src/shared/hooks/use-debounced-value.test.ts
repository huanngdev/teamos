import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { useDebouncedValue } from "./use-debounced-value";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("returns the initial value immediately", () => {
  const { result } = renderHook(() => useDebouncedValue("a", 300));

  expect(result.current).toBe("a");
});

test("only publishes the value after the delay elapses", () => {
  const { rerender, result } = renderHook(({ value }) => useDebouncedValue(value, 300), {
    initialProps: { value: "a" },
  });

  rerender({ value: "ab" });
  expect(result.current).toBe("a");

  act(() => {
    vi.advanceTimersByTime(299);
  });
  expect(result.current).toBe("a");

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(result.current).toBe("ab");
});

test("cancels the previous timer when the value changes again", () => {
  const { rerender, result } = renderHook(({ value }) => useDebouncedValue(value, 300), {
    initialProps: { value: "a" },
  });

  rerender({ value: "ab" });
  act(() => {
    vi.advanceTimersByTime(200);
  });

  rerender({ value: "abc" });
  act(() => {
    vi.advanceTimersByTime(200);
  });

  /* 400ms have passed, but the timer restarted with the latest value. */
  expect(result.current).toBe("a");

  act(() => {
    vi.advanceTimersByTime(100);
  });
  expect(result.current).toBe("abc");
});

test("does not update after unmount", () => {
  const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
    initialProps: { value: "a" },
  });

  rerender({ value: "ab" });
  unmount();

  expect(() => {
    act(() => {
      vi.advanceTimersByTime(300);
    });
  }).not.toThrow();
});
