// src/app.js — Orchestrateur SPA
import { initHome }              from './screens/home.js';
import { initIntro, showIntro }  from './screens/intro.js';
import { initReader, showReader, hideReader } from './screens/reader.js';
import { initEnd, showEnd }      from './screens/end.js';

const state = {
  currentScreen: 'home',
  currentHistoireId: null,
};

const screenEls = {
  home:   document.getElementById('screen-home'),
  intro:  document.getElementById('screen-intro'),
  reader: document.getElementById('screen-reader'),
  end:    document.getElementById('screen-end'),
};

/**
 * Navigate vers un écran.
 * @param {'home'|'intro'|'reader'|'end'} screen
 * @param {string|null} histoireId
 */
export function navigate(screen, histoireId = null) {
  // Teardown de l'écran sortant
  if (state.currentScreen === 'reader') {
    hideReader();
  }

  // Retirer l'écran courant
  const current = screenEls[state.currentScreen];
  if (current) current.classList.remove('is-active');

  state.currentScreen   = screen;
  state.currentHistoireId = histoireId;

  // Afficher le nouvel écran
  const next = screenEls[screen];
  if (next) next.classList.add('is-active');

  // Setup de l'écran entrant
  switch (screen) {
    case 'intro':
      showIntro(histoireId);
      break;
    case 'reader':
      showReader(histoireId);
      break;
    case 'end':
      showEnd(histoireId);
      break;
    // 'home' n'a pas de setup dynamique (statique une fois initialisé)
  }
}

// Boot — initialiser tous les modules d'écran, passer navigate en callback
initHome(navigate);
initIntro(navigate);
initReader(navigate);
initEnd(navigate);
