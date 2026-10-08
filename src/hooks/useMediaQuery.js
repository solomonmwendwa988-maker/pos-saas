import { useEffect, useState } from 'react';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = e => setMatches(e.matches);
    m.addEventListener?.('change', handler);
    return () => m.removeEventListener?.('change', handler);
  }, [query]);

  return matches;
}