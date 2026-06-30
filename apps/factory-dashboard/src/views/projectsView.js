// M-F3 : vue projets — refonte v3.0 — cartes groupées par statut

import { load } from '../store.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function projectColor(name) {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function renderCard(item) {
  const initiale = escapeHtml(item.titre.charAt(0).toUpperCase());
  const color = projectColor(item.titre);
  const nom = escapeHtml(item.titre);
  const isTermine = item.statut === 'terminé';
  const badgeClass = isTermine ? 'badge-statut-termine' : 'badge-statut-cours';
  const badgeLabel = isTermine ? 'terminé' : 'en cours';
  const shortUrl = item.url ? item.url.replace(/^https?:\/\//, '') : '';

  const urlHtml = item.url
    ? `<a class="project-url" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(shortUrl)} ↗</a>`
    : `<div class="project-url-none">Pas encore déployé</div>`;

  return `<div class="project-card">
      <div class="project-icon" style="background-color:${color}">${initiale}</div>
      <div class="project-info">
        <div class="project-name">${nom}</div>
        <span class="${badgeClass}">${badgeLabel}</span>
        ${urlHtml}
      </div>
    </div>`;
}

/**
 * Point d'entrée de la vue Projets.
 * Affiche uniquement les items de type "projet", groupés :
 *   - EN COURS : statut !== 'terminé', triés alphabétiquement
 *   - TERMINÉS  : statut === 'terminé', triés alphabétiquement (masqué si vide)
 * @param {HTMLElement} container
 */
export function renderProjects(container) {
  const { items: allItems } = load();
  const projets = allItems.filter(i => i.type === 'projet');

  const enCours = projets
    .filter(p => p.statut === 'en cours')
    .sort((a, b) => a.titre.localeCompare(b.titre));

  const termines = projets
    .filter(p => p.statut === 'terminé')
    .sort((a, b) => a.titre.localeCompare(b.titre));

  let inner = '';

  if (projets.length === 0) {
    inner = `<div class="empty-state">
      <span class="empty-state-icon">📁</span>
      <div class="empty-state-title">Aucun projet</div>
      <div class="empty-state-desc">Ajoute un projet depuis le backlog.</div>
    </div>`;
  } else {
    if (enCours.length > 0) {
      inner += `<div class="section-label">EN COURS</div>`;
      inner += enCours.map(renderCard).join('');
    }
    if (termines.length > 0) {
      inner += `<div class="section-label">TERMINÉS</div>`;
      inner += termines.map(renderCard).join('');
    }
  }

  container.innerHTML = `<div id="projects-view">
    <h1>Projets</h1>
    ${inner}
  </div>`;
}
