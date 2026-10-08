import { useEffect, useRef } from 'react';

/**
 * Detects USB barcode scanner input.
 *
 * Scanners behave like keyboards: they "type" the code very fast (< 25ms per char)
 * then send Enter. Human typing is > 100ms per char.
 *
 * We listen in capture phase so we can intercept before an input handles Enter.
 *
 * @param {(code: string) => void} onScan
 * @param {object} options
 * @param {number} options.maxGapMs     Reset the buffer if gap between keys exceeds this (default 80)
 * @param {number} options.minLength    Minimum code length to be treated as a scan (default 6)
 * @param {number} options.maxAvgMs     Average gap must be below this to count as a scan (default 25)
 * @param {boolean} options.enabled
 */
export function useBarcodeScanner(
  onScan,
  { maxGapMs = 80, minLength = 6, maxAvgMs = 25, enabled = true } = {}
) {
  const bufferRef = useRef([]);
  const handlerRef = useRef(onScan);

  useEffect(() => {
    handlerRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const onKey = e => {
      // Enter finalises the buffer
      if (e.key === 'Enter') {
        const buf = bufferRef.current;
        bufferRef.current = [];

        if (buf.length < minLength) return;
        const elapsed = buf[buf.length - 1].t - buf[0].t;
        const avg = elapsed / (buf.length - 1);
        if (avg > maxAvgMs) return;

        e.preventDefault();
        e.stopPropagation();
        handlerRef.current(buf.map(b => b.ch).join(''));
        return;
      }

      // Only single-character keys count
      if (e.key.length !== 1) return;
      // Ignore modifier-held keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = performance.now();
      const last = bufferRef.current[bufferRef.current.length - 1];
      if (!last || now - last.t > maxGapMs) {
        bufferRef.current = [];
      }
      bufferRef.current.push({ ch: e.key, t: now });
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled, maxGapMs, minLength, maxAvgMs]);
}