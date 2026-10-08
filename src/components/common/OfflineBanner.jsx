import { useEffect, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { syncQueue } from '@/services/syncQueue';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const { online, wasOffline, acknowledgeBack } = useOnlineStatus();
  const [queued, setQueued] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // Track queue size
  useEffect(() => {
    const tick = () => setQueued(syncQueue.size());
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, []);

  // Show "back online" toast for 4 seconds after reconnecting
  useEffect(() => {
    if (!wasOffline || !online) return;
    setShowBack(true);
    const t = setTimeout(() => {
      setShowBack(false);
      acknowledgeBack();
    }, 4000);
    return () => clearTimeout(t);
  }, [wasOffline, online, acknowledgeBack]);

  if (online && !showBack) return null;

  if (online && showBack) {
    return (
      <div className="ob ob-ok fade-up" role="status" aria-live="polite">
        <span className="ob-icon"><Wifi size={14} /></span>
        <span className="ob-text">
          Back online — your data is safe.
          {queued > 0 && (
            <> Syncing {queued} pending change{queued === 1 ? '' : 's'}…</>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="ob ob-offline" role="status" aria-live="polite">
      <span className="ob-icon"><CloudOff size={14} /></span>
      <span className="ob-text">
        <strong>You're offline.</strong> Sokoni keeps working — sales, products
        and inventory all update locally. Everything syncs when you're back online.
        {queued > 0 && (
          <> <span className="ob-queued">{queued} change{queued === 1 ? '' : 's'} waiting</span></>
        )}
      </span>
    </div>
  );
}