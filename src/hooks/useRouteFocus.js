import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Moves focus to the main content area on route change so screen
 * readers announce the new page. Runs after lazy chunks resolve.
 */
export function useRouteFocus(targetId = 'main-content') {
  const { pathname } = useLocation();

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el) el.focus({ preventScroll: false });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, targetId]);
}