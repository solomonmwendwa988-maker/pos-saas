import './RouteFallback.css';

export default function RouteFallback() {
  return (
    <div className="rf" role="status" aria-live="polite" aria-label="Loading">
      <div className="rf-mark">
        <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path
            d="M12 15h16l-1.6 12.2a2 2 0 0 1-2 1.8H15.6a2 2 0 0 1-2-1.8L12 15Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M16 15a4 4 0 0 1 8 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="rf-label">Loading</div>
    </div>
  );
}