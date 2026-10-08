import { useEffect } from 'react';

/**
 * Registers a global keyboard shortcut.
 *
 * @example
 *   useKeyboardShortcut(openPalette, { key: 'k', mod: true });
 *   // fires on Cmd+K (macOS) or Ctrl+K (Windows/Linux)
 *
 * @example
 *   useKeyboardShortcut(close, { key: 'Escape' });
 */
export function useKeyboardShortcut(
  handler,
  { key, mod = false, shift = false, alt = false, preventDefault = true, enabled = true } = {}
) {
  useEffect(() => {
    if (!enabled || !key) return;

    const onKey = e => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      const hasMod = e.metaKey || e.ctrlKey;
      if (mod && !hasMod) return;
      if (!mod && hasMod) return;
      if (shift && !e.shiftKey) return;
      if (!shift && e.shiftKey && key.toLowerCase() !== 'escape') return;
      if (alt !== e.altKey) return;
      if (preventDefault) e.preventDefault();
      handler(e);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, key, mod, shift, alt, preventDefault, enabled]);
}