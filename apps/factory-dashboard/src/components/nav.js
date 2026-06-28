// M-SHELL : barre de navigation — 2 onglets (Nouvel item / Backlog)

/**
 * Injecte la barre de navigation dans l'élément #nav.
 */
export function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = `
    <div class="nav-inner">
      <span class="nav-brand">factory-dashboard</span>
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
