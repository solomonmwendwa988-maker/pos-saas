import { useEffect, useState } from 'react';
import './WorkspaceLoader.css';

const DEFAULT_STEPS = [
  { label: 'Signing you in securely', duration: 420 },
  { label: 'Fetching your products', duration: 380 },
  { label: 'Loading customers and suppliers', duration: 380 },
  { label: 'Preparing your dashboard', duration: 340 },
  { label: 'Almost ready', duration: 260 },
];

export default function WorkspaceLoader({
  businessName = 'Your Business',
  userName = '',
  steps = DEFAULT_STEPS,
  onComplete,
}) {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = steps.reduce((s, x) => s + x.duration, 0);
    const started = Date.now();
    let raf;
    const tick = () => {
      const elapsed = Date.now() - started;
      const p = Math.min(100, (elapsed / total) * 100);
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [steps]);

  useEffect(() => {
    let cancelled = false;
    const advance = idx => {
      if (cancelled) return;
      if (idx >= steps.length) {
        // Slight pause so the last checkmark lands
        setTimeout(() => {
          if (!cancelled && onComplete) onComplete();
        }, 220);
        return;
      }
      setCurrent(idx);
      setTimeout(() => advance(idx + 1), steps[idx].duration);
    };
    advance(0);
    return () => {
      cancelled = true;
    };
  }, [steps, onComplete]);

  const greeting = userName ? `Welcome, ${userName.split(' ')[0]}` : 'Welcome back';

  return (
    <div className="wl" role="status" aria-live="polite">
      <div className="wl-glow wl-glow-a" aria-hidden="true" />
      <div className="wl-glow wl-glow-b" aria-hidden="true" />

      <div className="wl-card fade-up">
        <div className="wl-mark">
          <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path
              d="M12 15h16l-1.6 12.2a2 2 0 0 1-2 1.8H15.6a2 2 0 0 1-2-1.8L12 15Z"
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M16 15a4 4 0 0 1 8 0"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="wl-ring" />
          <span className="wl-ring wl-ring-2" />
        </div>

        <div className="wl-copy">
          <div className="wl-greeting">{greeting}</div>
          <div className="wl-biz">{businessName}</div>
          <div className="wl-status">Loading your workspace…</div>
        </div>

        <div className="wl-progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        <ul className="wl-steps">
          {steps.map((s, i) => {
            const state =
              i < current ? 'done' : i === current ? 'active' : 'idle';
            return (
              <li key={s.label} className={`wl-step wl-step-${state}`}>
                <span className="wl-step-dot">
                  {state === 'done' && (
                    <svg viewBox="0 0 12 12" width="10" height="10">
                      <path
                        d="M2 6l3 3 5-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="wl-step-label">{s.label}</span>
              </li>
            );
          })}
        </ul>

        <div className="wl-foot">Powered by Sokoni</div>
      </div>
    </div>
  );
}