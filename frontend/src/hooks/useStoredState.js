import { useEffect, useState } from "react";

/** State that survives a reload. Falls back to memory when storage is off. */
export default function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode, quota, blocked storage — keep going in memory */
    }
  }, [key, value]);

  return [value, setValue];
}
