import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WorkspaceLoader from '@/components/common/WorkspaceLoader';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { productService } from '@/services/productService';
import { customerService } from '@/services/customerService';
import { salesService } from '@/services/salesService';
import { supplierService } from '@/services/supplierService';
import { shiftService } from '@/services/shiftService';

export default function Loading() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const { business } = useBusiness();
  const [ready, setReady] = useState(false);

  const next = loc.state?.next || '/dashboard';

  // Preload the essential data while the animation plays
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          productService.list(),
          customerService.list(),
          supplierService.list(),
          salesService.list(),
          shiftService.findActive(user?.fullName?.trim() || 'Owner'),
        ]);
      } catch {
        // Loading is best-effort; the pages will re-fetch anyway.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.fullName]);

  // Wait for BOTH the animation and data to finish before navigating
  const [animationDone, setAnimationDone] = useState(false);

  const handleComplete = useCallback(() => {
    setAnimationDone(true);
  }, []);

  useEffect(() => {
    if (animationDone && ready) {
      nav(next, { replace: true });
    }
  }, [animationDone, ready, next, nav]);

  return (
    <WorkspaceLoader
      businessName={business?.name || 'Your Business'}
      userName={user?.fullName || ''}
      onComplete={handleComplete}
    />
  );
}