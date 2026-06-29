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
