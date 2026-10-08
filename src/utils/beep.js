/**
 * Short beeps for the POS. Generated via the Web Audio API at runtime,
 * so there are no asset files and no download cost.
 *
 * Browsers require the AudioContext to be created or resumed after a
 * user gesture. We lazily create it and resume on first call.
 */

let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    return ctx;
  } catch {
    return null;
  }
}

export function beep({
  frequency = 1200,
  duration = 70,
  volume = 0.15,
  type = 'square',
} = {}) {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') {
    audio.resume().catch(() => {});
  }
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration / 1000 + 0.03);
  } catch {
    /* ignored */
  }
}

/** Crisp high tone — the classic POS scanner blip. */
export const scanBeep = () =>
  beep({ frequency: 1500, duration: 55, volume: 0.12, type: 'square' });

/** Two-tone confirmation for a completed sale. */
export const successBeep = () => {
  beep({ frequency: 900, duration: 90, volume: 0.14 });
  setTimeout(() => beep({ frequency: 1300, duration: 110, volume: 0.14 }), 100);
};

/** Soft low buzz for errors / not found. */
export const errorBeep = () =>
  beep({ frequency: 260, duration: 180, volume: 0.12, type: 'sawtooth' });

/** Quiet click for UI actions (add to cart via quick key). */
export const tapBeep = () =>
  beep({ frequency: 2000, duration: 25, volume: 0.06 });