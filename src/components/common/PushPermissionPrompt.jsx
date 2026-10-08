import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import Button from './Button';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import './PushPermissionPrompt.css';

const DISMISS_KEY = 'sokoni.push.prompt.dismissedAt';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function wasDismissedRecently() {
  const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() - ts < COOLDOWN_MS;
}

export default function PushPermissionPrompt() {
  const { isAuthenticated } = useAuth();
  const { supported, permission, enabled, request, busy } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supported) return;
    if (permission === 'granted' || enabled) return;
    if (permission === 'denied') return;
    if (wasDismissedRecently()) return;
    if (sessionStorage.getItem('sokoni.push.prompted')) return;

    const t = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem('sokoni.push.prompted', '1');
    }, 5000);
    return () => clearTimeout(t);
  }, [isAuthenticated, supported, permission, enabled]);

  const allow = async () => {
    try {
      await request();
    } finally {
      setVisible(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="ppp fade-up" role="dialog" aria-label="Enable notifications">
      <button className="ppp-close" onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </button>

      <div className="ppp-icon">
        <Bell size={22} />
      </div>

      <div className="ppp-body">
        <div className="ppp-title">Turn on notifications</div>
        <div className="ppp-text">
          Get notified about new sales, low stock, shift results and payments —
          even when Sokoni is closed.
        </div>
      </div>

      <div className="ppp-actions">
        <Button size="sm" onClick={allow} loading={busy}>
          Allow
        </Button>
        <button className="ppp-later" onClick={dismiss} type="button">
          Not now
        </button>
      </div>
    </div>
  );
}