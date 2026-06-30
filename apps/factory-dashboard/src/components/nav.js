// M-NAV : tab bar fixed bottom + badge « Hors ligne »

const ICON_LIST = `<svg class="tab-bar-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="8" y1="6" x2="21" y2="6"/>
  <line x1="8" y1="12" x2="21" y2="12"/>
  <line x1="8" y1="18" x2="21" y2="18"/>
  <line x1="3" y1="6" x2="3.01" y2="6"/>
  <line x1="3" y1="12" x2="3.01" y2="12"/>
  <line x1="3" y1="18" x2="3.01" y2="18"/>
</svg>`;

const ICON_FOLDER = `<svg class="tab-bar-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
</svg>`;

/**
 * Injecte le tab bar fixed bottom dans l'élément #nav.
 * 2 onglets : Backlog (#/backlog) et Projets (#/projects).
 * La création d'items passe par le FAB (plus de lien « + Nouvel item »).
 */
export function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = `
    <nav class="tab-bar">
      <button class="tab-bar-item" data-route="#/backlog">
        ${ICON_LIST}
        <span class="tab-bar-label">Backlog</span>
      </button>
      <button class="tab-bar-item" data-route="#/projects">
        ${ICON_FOLDER}
        <span class="tab-bar-label">Projets</span>
      </button>
    </nav>
  `;
}

/**
 * Met en surbrillance l'onglet correspondant au hash actif.
 * @param {string} hash — ex: '#/backlog' ou '#/projects'
 */
export function updateActiveNav(hash) {
  const items = document.querySelectorAll('.tab-bar-item');
  const effectiveHash = hash === '#/' || hash === '' ? '#/backlog' : hash;
  items.forEach(item => {
    const route = item.getAttribute('data-route');
    item.classList.toggle('active', route === effectiveHash);
  });
}

/**
 * Injecte ou retire le badge « Hors ligne » selon navigator.onLine.
 * Le badge est positionné dans .filter-strip si présent, sinon en tête de #app.
 * Doit être appelé au boot (après renderNav) et sur chaque event online/offline.
 */
export function updateOnlineBadge() {
  const existing = document.querySelector('.badge-offline');
  if (existing) existing.remove();

  if (navigator.onLine) return;

  const badge = document.createElement('span');
  badge.className = 'badge-offline';
  badge.textContent = '● Hors ligne';

  const filterStrip = document.querySelector('.filter-strip');
  if (filterStrip) {
    filterStrip.appendChild(badge);
  } else {
    const app = document.getElementById('app');
    if (app) app.prepend(badge);
  }
}
