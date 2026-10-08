import { useEffect, useRef, useState } from 'react';
import './Reveal.css';

/**
 * Fades and slides its children in when they enter the viewport.
 * Runs once per element. Respects prefers-reduced-motion.
 *
 * @param {number} delay    ms to wait before starting the transition
 * @param {number} y        starting vertical offset in px
 * @param {string} className optional extra class(es)
 * @param {boolean} once    unobserve after first reveal (default true)
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
  once = true,
  as: Tag = 'div',
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return;
    }

    // If IntersectionObserver isn't available, reveal immediately
    if (!('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'reveal-in' : ''} ${className}`.trim()}
      style={{
        '--reveal-delay': `${delay}ms`,
        '--reveal-y': `${y}px`,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}