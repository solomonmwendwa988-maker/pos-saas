export default function Logo({ size = 32, light = false }) {
  return (
    <div className="row gap-8" style={{ alignItems: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect width="40" height="40" rx="11" fill="url(#sg)" />
        <path
          d="M12 15h16l-1.6 12.2a2 2 0 0 1-2 1.8H15.6a2 2 0 0 1-2-1.8L12 15Z"
          stroke="#fff" strokeWidth="2" strokeLinejoin="round"
        />
        <path d="M16 15a4 4 0 0 1 8 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="40" y2="40">
            <stop stopColor="#7c6cff" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: '-0.03em',
          color: light ? '#fff' : 'var(--text)',
        }}
      >
        Sokoni
      </span>
    </div>
  );
}