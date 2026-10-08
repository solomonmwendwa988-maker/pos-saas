import { useEffect, useState } from 'react';
import { countdownParts } from '@/utils/billing';

export function useTrialCountdown(targetIso, { tick = 1000 } = {}) {
  const [parts, setParts] = useState(() => countdownParts(targetIso));

  useEffect(() => {
    if (!targetIso) return;
    setParts(countdownParts(targetIso));
    const t = setInterval(() => setParts(countdownParts(targetIso)), tick);
    return () => clearInterval(t);
  }, [targetIso, tick]);

  return parts;
}