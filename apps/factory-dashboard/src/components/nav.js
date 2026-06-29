// M-NAV : barre de navigation + badge « Hors ligne »

/**
 * Injecte la barre de navigation dans l'élément #nav.
 * Le badge .badge-offline est masqué par défaut (hidden) ;
 * updateOnlineBadge() le rend visible quand !navigator.onLine.
 */
export function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = `
    <div class="nav-inner">
      <span class="nav-brand">factory-dashboard</span>
      <span class="badge-offline" hidden>Hors ligne</span>
      <div class="nav-links">
        <a href="#/projects" class="nav-link" data-route="#/projects">Projets</a>
        <a href="#/new" class="nav-link" data-route="#/new">+ Nouvel item</a>
        <a href="#/backlog" class="nav-link" data-route="#/backlog">Backlog</a>
      </div>
    </div>
  `;
}

/**
 * Met en surbrillance le lien de navigation correspondant au hash actif.
 * @param {string} hash — ex: '#/backlog' ou '#/new'
 */
export function updateActiveNav(hash) {
  const links = document.querySelectorAll('.nav-link');
  const effectiveHash = hash === '#/' || hash === '' ? '#/backlog' : hash;
  links.forEach(link => {
    const route = link.getAttribute('data-route');
    link.classList.toggle('active', route === effectiveHash);
  });
}

/**
 * Bascule la visibilité du badge « Hors ligne » selon navigator.onLine.
 * Doit être appelé au boot (après renderNav) et sur chaque event online/offline.
 */
export function updateOnlineBadge() {
  const badge = document.querySelector('.badge-offline');
  if (badge) badge.hidden = navigator.onLine;
}
