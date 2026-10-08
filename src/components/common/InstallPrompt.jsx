import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import Button from './Button';
import './InstallPrompt.css';

const DISMISS_KEY = 'sokoni.installPrompt.dismissedAt';
const DISMISS_COOLDOWN = 14 * 24 * 60 * 60 * 1000; // 14 days

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function wasDismissedRecently() {
  const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() - ts < DISMISS_COOLDOWN;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBeforeInstall = e => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS: no beforeinstallprompt — show our own hint
    if (isIOS()) {
      // Show after a short delay so it doesn't compete with the first paint
      const t = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 3500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      deferred.prompt();
      const result = await deferred.userChoice;
      if (result?.outcome === 'accepted') {
        setVisible(false);
      } else {
        dismiss();
      }
      setDeferred(null);
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="ip fade-up" role="dialog" aria-label="Install Sokoni">
      <button className="ip-close" onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </button>

      <div className="ip-icon"><Smartphone size={22} /></div>

      <div className="ip-body">
        <div className="ip-title">Install Sokoni</div>
        {iosHint ? (
          <div className="ip-text">
            Tap <Share size={12} className="ip-share" /> <strong>Share</strong>, then{' '}
            <strong>Add to Home Screen</strong>. Sokoni works offline and opens
            like a native app.
          </div>
        ) : (
          <div className="ip-text">
            Add Sokoni to your home screen for one-tap access. It works offline
            and updates automatically.
          </div>
        )}
      </div>

      {!iosHint && (
        <div className="ip-actions">
          <Button
            size="sm"
            leftIcon={<Download size={13} />}
            loading={installing}
            onClick={install}
          >
            Install
          </Button>
        </div>
      )}
    </div>
  );
}