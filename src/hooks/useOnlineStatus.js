import { useEffect, useState } from 'react';

/**
 * Returns { online, wasOffline, lastOnlineAt, lastOfflineAt }.
 * Uses the browser's native online/offline events plus a periodic
 * navigator.onLine check as a safety net.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState(Date.now());
  const [lastOfflineAt, setLastOfflineAt] = useState(null);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setLastOnlineAt(Date.now());
      setWasOffline(true);
    };
    const goOffline = () => {
      setOnline(false);
      setLastOfflineAt(Date.now());
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const check = setInterval(() => {
      const isOnline = navigator.onLine;
      if (isOnline !== online) {
        if (isOnline) goOnline();
        else goOffline();
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(check);
    };
  }, [online]);

  const acknowledgeBack = () => setWasOffline(false);

  return { online, wasOffline, lastOnlineAt, lastOfflineAt, acknowledgeBack };
}