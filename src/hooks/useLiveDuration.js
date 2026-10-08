import { useEffect, useState } from 'react';

/**
 * Returns elapsed milliseconds since `startedAt`.
 * If `endedAt` is provided, the value is frozen at `endedAt - startedAt`
 * and no interval runs.
 */
export function useLiveDuration(startedAt, endedAt = null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || endedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt, endedAt]);

  if (!startedAt) return 0;
  const end = endedAt || now;
  return Math.max(0, end - startedAt);
}