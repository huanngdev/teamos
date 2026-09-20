import { useEffect, useState } from "react";

/*
 * Returns `value` only after it has stopped changing for `delayMs`. The previous
 * timer is always cancelled, so a burst of keystrokes produces a single update.
 */
function useDebouncedValue<Value>(value: Value, delayMs: number): Value {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

export { useDebouncedValue };
