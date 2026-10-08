import { useCallback, useEffect, useState } from 'react';
import { pushNotificationService } from '@/services/pushNotificationService';

export function usePushNotifications() {
  const [supported] = useState(() => pushNotificationService.isSupported());
  const [permission, setPermission] = useState(() =>
    pushNotificationService.getPermission()
  );
  const [enabled, setEnabled] = useState(() =>
    pushNotificationService.isEnabled()
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const refresh = () => {
      setPermission(pushNotificationService.getPermission());
      setEnabled(pushNotificationService.isEnabled());
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [supported]);

  const request = useCallback(async () => {
    setBusy(true);
    try {
      const result = await pushNotificationService.requestPermission();
      setPermission(result);
      setEnabled(result === 'granted');
      return result;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(() => {
    pushNotificationService.setEnabled(false);
    setEnabled(false);
  }, []);

  const enable = useCallback(async () => {
    if (permission !== 'granted') {
      return request();
    }
    pushNotificationService.setEnabled(true);
    setEnabled(true);
    return 'granted';
  }, [permission, request]);

  const test = useCallback(() => {
    return pushNotificationService.sendTest();
  }, []);

  return { supported, permission, enabled, busy, request, enable, disable, test };
}