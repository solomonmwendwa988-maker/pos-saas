export default function RouteFallback() {
  return (
    <div className="route-fallback">
      <div className="rf-spinner" />
      <style>{`
        .route-fallback {
          min-height: 60vh; display: flex; align-items: center; justify-content: center;
        }
        .rf-spinner {
          width: 32px; height: 32px; border-radius: 50%;
          border: 3px solid var(--primary-50);
          border-top-color: var(--primary);
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}