/**
 * Screen-reader support: a visually hidden aria-live region (in index.html) that mirrors what the
 * focused widget is and important messages (toasts, combat log in phase 2). Everything visible is
 * drawn in WebGL, so this is the only way assistive tech hears the UI.
 */

let region: HTMLElement | null = null;

function liveRegion(): HTMLElement {
  if (region) return region;
  const el = document.getElementById('sr-live');
  if (!el) throw new Error('a11y: #sr-live aria-live region missing from index.html');
  region = el;
  return el;
}

let last = '';
/** Announce `text` politely. Repeating the same text re-announces it (toggles a trailing nbsp). */
export function announce(text: string): void {
  const el = liveRegion();
  const msg = text === last ? `${text} ` : text;
  last = msg;
  el.textContent = msg;
}
