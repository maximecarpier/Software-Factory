// M-SHELL : point d'entrée — initialise la nav, le routeur, et la sync GitHub

import './style.css';
import { renderNav } from './components/nav.js';
import { initRouter } from './router.js';
import { fetchFromGitHub } from './store.js';
import { showToast } from './components/toast.js';
import { renderBacklog } from './views/backlogView.js';

renderNav();
initRouter();

// ── Synchronisation GitHub en arrière-plan ────────────────────────────────────
// Affiche d'abord le cache localStorage (via initRouter ci-dessus),
// puis met à jour les données depuis GitHub et re-rend si la vue backlog est active.
(async () => {
  try {
    await fetchFromGitHub();

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
