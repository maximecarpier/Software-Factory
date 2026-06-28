// M-F3 : vue projets — liste des items de type "projet", groupés par statut

import { load } from '../store.js';

/**
 * Échappe les caractères HTML pour éviter les injections XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Tronque une chaîne à max caractères avec ellipse si nécessaire.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

/**
 * Génère le HTML d'une carte projet.
 * Si l'item a un champ url, la carte entière est un lien cliquable.
 * @param {Object} item
 * @returns {string}
 */
function renderProjectCard(item) {
  const desc = item.description ? truncate(item.description, 120) : null;
  const statut = item.statut || 'à faire';
  const statutSlug = statut.replace(/\s+/g, '-');

  const cardInner = `
    <div class="card">
      <div class="card-header">
        <div class="card-badges">
          <span class="badge prio-${escapeHtml(item.priorite)}">${escapeHtml(item.priorite)}</span>
          <span class="badge badge-statut statut-${escapeHtml(statutSlug)}">${escapeHtml(statut)}</span>
        </div>
      </div>
      <h3 class="card-title">${escapeHtml(item.titre)}</h3>
      ${desc ? `<p class="card-desc">${escapeHtml(desc)}</p>` : ''}
      ${!item.url ? `<p class="card-no-url">Pas d'URL configurée</p>` : ''}
    </div>
  `;

  if (item.url) {
    return `<a href="${escapeHtml(item.url)}" class="card-link" target="_blank" rel="noopener noreferrer">${cardInner}</a>`;
  }
  return cardInner;
}

/**
 * Point d'entrée de la vue Projets.
 * Affiche uniquement les items de type "projet", groupés par statut.
 * Ordre des groupes : "En cours" → "À faire" → "Terminé".
 * @param {HTMLElement} container — typiquement #app
 */
export function renderProjects(container) {
  const { items: allItems } = load();
  const projects = allItems.filter(i => i.type === 'projet');

  let innerContent = '';

  if (projects.length === 0) {
    innerContent = `
      <div class="empty-state">
        <p class="empty-title">Aucun projet dans le backlog.</p>
        <p class="empty-sub">Commencez par ajouter un projet.</p>
        <a href="#/new" class="btn-primary">+ Ajouter un projet</a>
      </div>
    `;
  } else {
    const groups = [
      { key: 'en cours', label: 'En cours' },
      { key: 'à faire', label: 'À faire' },
      { key: 'terminé', label: 'Terminé' },
    ];

    const groupsHtml = groups
      .map(({ key, label }) => {
        // Items dont le statut (ou le statut par défaut) correspond au groupe
        const groupItems = projects.filter(p => (p.statut || 'à faire') === key);
        if (groupItems.length === 0) return '';

        const cardsHtml = groupItems.map(renderProjectCard).join('');
        return `
          <div class="projects-group">
            <h2>${label}</h2>
            ${cardsHtml}
          </div>
        `;
      })
      .join('');

    innerContent = groupsHtml || `
      <div class="empty-state">
        <p class="empty-title">Aucun projet à afficher.</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="projects-container">
      <h1>Projets</h1>
      ${innerContent}
    </div>
  `;
}
