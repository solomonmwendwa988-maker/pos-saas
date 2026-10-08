import { useEffect, useState } from 'react';

/**
 * Delays updates to `value` until the user stops typing for `delay` ms.
 * Use with search inputs to avoid firing an API call on every keystroke.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}