// M-SHELL : point d'entrée — initialise la nav, le routeur, et la sync Redis

import './style.css';
import { renderNav, updateOnlineBadge } from './components/nav.js';
import { initRouter } from './router.js';
import { fetchFromGitHub } from './store.js';
import { showToast } from './components/toast.js';
import { renderBacklog } from './views/backlogView.js';
import { hasPending, flushPending } from './sync.js';

renderNav();
initRouter();

// ── Helper haptic (best-effort — navigator.vibrate absent sur iOS Safari) ────
function haptic(type = 'light') {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(patterns[type] ?? 10);
  }
}

// ── FAB ──────────────────────────────────────────────────────────────────────
const fab = document.createElement('button');
fab.className = 'fab';
fab.setAttribute('aria-label', 'Ajouter un item');
fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
fab.addEventListener('click', () => {
  haptic('light');
  window.location.hash = '#/new';
});
document.body.appendChild(fab);

// ── Pull-to-refresh ──────────────────────────────────────────────────────────
let ptrStartY = 0;
let ptrActive = false;

document.addEventListener('touchstart', e => {
  if (window.scrollY === 0) {
    ptrStartY = e.touches[0].clientY;
    ptrActive = true;
  }
}, { passive: true });

document.addEventListener('touchcancel', () => { ptrActive = false; });

document.addEventListener('touchend', async e => {
  if (!ptrActive) return;
  const deltaY = e.changedTouches[0].clientY - ptrStartY;
  ptrActive = false;
  if (deltaY > 60) {
    try {
      await fetchFromGitHub();
      const hash = window.location.hash;
      const onBacklog = !hash || hash === '#' || hash === '#/' || hash === '#/backlog';
      if (onBacklog) {
        const app = document.getElementById('app');
        if (app) renderBacklog(app);
      }
    } catch {
      showToast('Hors ligne — cache affiché');
    }
  }
}, { passive: true });

// ── Badge hors-ligne (état initial + mise à jour dynamique) ──────────────────
updateOnlineBadge();
window.addEventListener('online', updateOnlineBadge);
window.addEventListener('offline', updateOnlineBadge);

// ── Flush automatique au retour réseau ───────────────────────────────────────
window.addEventListener('online', () => {
  flushPending(); // fire-and-forget
});

// ── Synchronisation au boot : séquence flush → fetch (règle d'or) ────────────
// Ne jamais fetch avant flush : fetchFromGitHub() écraserait le cache local
// si des mutations offline non poussées sont encore en file (factory_pending).
(async () => {
  try {
    if (hasPending()) {
      await flushPending(); // le local est plus récent → on le pousse d'abord
    }
    await fetchFromGitHub(); // puis on tire Redis → met à jour le cache

    // Re-rendre la vue backlog si l'utilisateur y est toujours
    const hash = window.location.hash;
    const onBacklog = !hash || hash === '#' || hash === '#/' || hash === '#/backlog';
    if (onBacklog) {
      const app = document.getElementById('app');
      if (app) renderBacklog(app);
    }
  } catch {
    // Échec réseau ou token absent : mode hors-ligne, le cache localStorage suffit
    showToast('Mode hors-ligne — données non synchronisées');
  }
})();
