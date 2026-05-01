import { useEffect, useState } from "react";

/**
 * Returns a live-updating timestamp (ms since epoch).
 * Updates on the specified interval (default 60s) so overdue
 * badges/stats auto-refresh without a full page reload.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
