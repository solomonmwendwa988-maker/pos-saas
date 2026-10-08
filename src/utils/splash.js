/**
 * Gracefully removes the inline splash screen.
 *
 * Full splash (first launch in a session):
 *   0     → 1200ms   logo pops in
 *   500   → 1400ms   progress bar fades up
 *   700   → 2700ms   progress bar fills
 *   2700  → 2900ms   hold so the full bar is visible
 *   2900  → 3800ms   splash blurs/scales out, app cross-fades in
 *
 * Short splash (repeat visits):
 *   Same choreography, app revealed at SHORT_VISIBLE_MS.
 */

const FULL_VISIBLE_MS = 2900;
const SHORT_VISIBLE_MS = 1200;
const EXIT_DURATION_MS = 950;

let hideScheduled = false;

export function hideSplash() {
  if (hideScheduled) return;
  hideScheduled = true;

  const splash = document.getElementById('splash');
  if (!splash) {
    document.body.classList.add('app-ready');
    return;
  }

  const startedAt = Number(
    sessionStorage.getItem('sokoni.splash.startedAt') || 0
  );
  const hasLaunched = sessionStorage.getItem('sokoni.splash.launched') === '1';
  const elapsed = startedAt ? Date.now() - startedAt : 0;
  const target = hasLaunched ? SHORT_VISIBLE_MS : FULL_VISIBLE_MS;
  const wait = Math.max(0, target - elapsed);

  setTimeout(() => {
    document.body.classList.add('app-ready');

    setTimeout(() => {
      splash.remove();
    }, EXIT_DURATION_MS + 100);
  }, wait);
}