import { useEffect, useState } from 'react';
import { Check, Download } from 'lucide-react';
import Button from './Button';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallButton() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = e => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const result = await deferred.userChoice;
    if (result?.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferred(null);
  };

  if (installed) {
    return (
      <div className="ib-installed">
        <Check size={14} /> Sokoni is installed on this device
      </div>
    );
  }

  if (!deferred) {
    return (
      <div className="ib-hint">
        Open Sokoni in Chrome, Edge or Safari and use your browser menu to
        add it to your home screen.
      </div>
    );
  }

  return (
    <Button leftIcon={<Download size={14} />} onClick={install}>
      Install Sokoni
    </Button>
  );
}