// M-SHELL : routing hash-based (#/new ↔ #/backlog)
// Pas de dépendance externe — écoute window.hashchange

import { renderForm } from './views/formView.js';
import { renderBacklog } from './views/backlogView.js';
import { updateActiveNav } from './components/nav.js';

/**
 * Retourne le hash actuel normalisé.
 * Un hash vide ou '#/' est traité comme '#/backlog' (vue par défaut).
 */
function getHash() {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '#/backlog';
  return hash;
}

/**
 * Rend la vue correspondante au hash donné.
 * @param {string} hash
 */
function route(hash) {
  const app = document.getElementById('app');
  if (!app) return;

  updateActiveNav(hash);

  if (hash === '#/new') {
    renderForm(app);
  } else {
    // '#/backlog' et tout hash inconnu → vue backlog par défaut
    renderBacklog(app);
  }
}

/**
 * Initialise le routeur : écoute hashchange + render initial.
 */
export function initRouter() {
  window.addEventListener('hashchange', () => {
    route(getHash());
  });
  // Render initial au chargement
  route(getHash());
}
