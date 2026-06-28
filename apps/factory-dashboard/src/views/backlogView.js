// M-F2 : vue backlog — liste + filtres + tri + édition + suppression + états vide

import { load, save, pushToGitHub } from '../store.js';
import { applyFilters, applySort } from '../model.js';
import { showToast } from '../components/toast.js';

// État local des filtres/tri (non persisté, reset au rechargement)
const state = {
  filterType: '',
  filterPriorite: '',
  filterStatut: '',
  sortKey: 'recent',
};

/**
 * Formate une date ISO 8601 en JJ/MM/AAAA.
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
 * Génère le HTML de la barre de filtres + tri.
 * @returns {string}
 */
function renderFilterBar() {
  return `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="filter-type">Type</label>
        <select id="filter-type">
          <option value="">Tous les types</option>
          <option value="projet" ${state.filterType === 'projet' ? 'selected' : ''}>Projet</option>
          <option value="feature" ${state.filterType === 'feature' ? 'selected' : ''}>Feature</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-prio">Priorité</label>
        <select id="filter-prio">
          <option value="">Toutes les priorités</option>
          <option value="haute" ${state.filterPriorite === 'haute' ? 'selected' : ''}>Haute</option>
          <option value="moyenne" ${state.filterPriorite === 'moyenne' ? 'selected' : ''}>Moyenne</option>
          <option value="basse" ${state.filterPriorite === 'basse' ? 'selected' : ''}>Basse</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-statut">Statut</label>
        <select id="filter-statut">
          <option value="">Tous les statuts</option>
          <option value="à faire" ${state.filterStatut === 'à faire' ? 'selected' : ''}>À faire</option>
          <option value="en cours" ${state.filterStatut === 'en cours' ? 'selected' : ''}>En cours</option>
          <option value="terminé" ${state.filterStatut === 'terminé' ? 'selected' : ''}>Terminé</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-sort">Tri</label>
        <select id="filter-sort">
          <option value="recent" ${state.sortKey === 'recent' ? 'selected' : ''}>Plus récent d'abord</option>
          <option value="ancien" ${state.sortKey === 'ancien' ? 'selected' : ''}>Plus ancien d'abord</option>
          <option value="prio-desc" ${state.sortKey === 'prio-desc' ? 'selected' : ''}>Priorité décroissante</option>
          <option value="prio-asc" ${state.sortKey === 'prio-asc' ? 'selected' : ''}>Priorité croissante</option>
        </select>
      </div>
    </div>
  `;
}

/**
 * Génère le HTML d'une carte item.
 * @param {Object} item
 * @param {Object[]} allItems - tableau complet pour résoudre le nom du projet parent
 * @returns {string}
 */
function renderCard(item, allItems) {
  const desc = item.description ? truncate(item.description, 120) : null;

  // Badge projet parent pour les features
  let projectBadge = '';
  if (item.type === 'feature' && item.projectId) {
    const parentProject = allItems.find(i => i.id === item.projectId);
    if (parentProject) {
      projectBadge = `<span class="badge badge-project">${escapeHtml(parentProject.titre)}</span>`;
    }
  }

  const statutSlug = item.statut ? item.statut.replace(/\s+/g, '-') : '';
  const statutBadge = item.statut
    ? `<span class="badge badge-statut statut-${escapeHtml(statutSlug)}">${escapeHtml(item.statut)}</span>`
    : '';

  return `
    <div class="card" data-id="${escapeHtml(item.id)}">
      <div class="card-header">
        <div class="card-badges">
          <span class="badge badge-type badge-${escapeHtml(item.type)}">${escapeHtml(item.type)}</span>
          <span class="badge badge-prio prio-${escapeHtml(item.priorite)}">${escapeHtml(item.priorite)}</span>
          ${statutBadge}
          ${projectBadge}
        </div>
        <span class="card-date">${formatDate(item.createdAt)}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.titre)}</h3>
      ${desc ? `<p class="card-desc">${escapeHtml(desc)}</p>` : ''}
      <div class="card-statut">
        <select class="statut-select" data-id="${escapeHtml(item.id)}">
          <option value="à faire" ${(item.statut || 'à faire') === 'à faire' ? 'selected' : ''}>À faire</option>
          <option value="en cours" ${item.statut === 'en cours' ? 'selected' : ''}>En cours</option>
          <option value="terminé" ${item.statut === 'terminé' ? 'selected' : ''}>Terminé</option>
        </select>
      </div>
      <div class="card-actions">
        <button class="btn-edit" data-id="${escapeHtml(item.id)}" aria-label="Modifier cet item">Éditer</button>
        <button class="btn-delete" data-id="${escapeHtml(item.id)}" aria-label="Supprimer cet item">Supprimer</button>
      </div>
    </div>
  `;
}

/**
 * Point d'entrée unique pour le rendu de la vue backlog.
 * Appelée à chaque changement de filtre/tri, navigation vers #/backlog,
 * et après synchronisation GitHub.
 * @param {HTMLElement} container — typiquement #app
 */
export function renderBacklog(container) {
  const { items: allItems, corrupted } = load();

  const filtered = applyFilters(allItems, {
    type: state.filterType,
    priorite: state.filterPriorite,
    statut: state.filterStatut,
  });
  const sorted = applySort(filtered, state.sortKey);

  // Bandeau d'avertissement si données corrompues au démarrage
  const corruptedBanner = corrupted
    ? `<div class="banner-warning" role="alert">Données locales illisibles, backlog réinitialisé.</div>`
    : '';

  let innerContent = '';

  if (allItems.length === 0) {
    // État vide absolu — aucun item dans le store
    innerContent = `
      <div class="empty-state">
        <p class="empty-title">Aucun item dans le backlog.</p>
        <p class="empty-sub">Commencez par ajouter votre premier item.</p>
        <a href="#/new" class="btn-primary">+ Ajouter un item</a>
      </div>
    `;
  } else {
    const filterBarHtml = renderFilterBar();

    if (sorted.length === 0) {
      // État vide filtré — les filtres actifs excluent tous les items
      innerContent = filterBarHtml + `
        <div class="empty-state">
          <p class="empty-title">Aucun item ne correspond à ces filtres.</p>
          <button class="btn-secondary" id="reset-filters">Réinitialiser les filtres</button>
        </div>
      `;
    } else {
      // État normal — compteur + cartes
      const total = allItems.length;
      const shown = sorted.length;
      const counterLabel = shown === total
        ? `${shown} item${shown > 1 ? 's' : ''}`
        : `${shown} item${shown > 1 ? 's' : ''} sur ${total}`;

      const cardsHtml = sorted.map(item => renderCard(item, allItems)).join('');

      innerContent = filterBarHtml + `
        <p class="counter">${counterLabel}</p>
        <div class="card-list">${cardsHtml}</div>
      `;
    }
  }

  container.innerHTML = `
    <div class="backlog-container">
      <h1>Backlog</h1>
      ${corruptedBanner}
      ${innerContent}
    </div>
  `;

  // Liaison des événements (après injection dans le DOM)
  bindFilterEvents(container);
  bindCardActions(container);
}

/**
 * Attache les listeners sur les selects de filtre/tri et le bouton reset.
 * @param {HTMLElement} container
 */
function bindFilterEvents(container) {
  const filterTypeEl = container.querySelector('#filter-type');
  const filterPrioEl = container.querySelector('#filter-prio');
  const filterStatutEl = container.querySelector('#filter-statut');
  const filterSortEl = container.querySelector('#filter-sort');
  const resetBtn = container.querySelector('#reset-filters');

  if (filterTypeEl) {
    filterTypeEl.addEventListener('change', e => {
      state.filterType = e.target.value;
      renderBacklog(container);
    });
  }

  if (filterPrioEl) {
    filterPrioEl.addEventListener('change', e => {
      state.filterPriorite = e.target.value;
      renderBacklog(container);
    });
  }

  if (filterStatutEl) {
    filterStatutEl.addEventListener('change', e => {
      state.filterStatut = e.target.value;
      renderBacklog(container);
    });
  }

  if (filterSortEl) {
    filterSortEl.addEventListener('change', e => {
      state.sortKey = e.target.value;
      renderBacklog(container);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.filterType = '';
      state.filterPriorite = '';
      state.filterStatut = '';
      renderBacklog(container);
    });
  }
}

/**
 * Attache les listeners Éditer et Supprimer sur les cartes.
 * La suppression : confirmation → localStorage → re-render → push GitHub async.
 * @param {HTMLElement} container
 */
function bindCardActions(container) {
  // Éditer — navigation vers #/edit/:id
  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      window.location.hash = `#/edit/${id}`;
    });
  });

  // Statut inline — changement immédiat + sync GitHub
  container.querySelectorAll('.statut-select').forEach(select => {
    select.addEventListener('change', async e => {
      const id = e.currentTarget.dataset.id;
      const newStatut = e.currentTarget.value;

      const { items } = load();
      const updatedItems = items.map(item =>
        item.id === id ? { ...item, statut: newStatut } : item
      );

      save(updatedItems);
      renderBacklog(container);

      try {
        await pushToGitHub(updatedItems);
      } catch {
        showToast('Mode hors-ligne — données non synchronisées');
      }
    });
  });

  // Supprimer — confirmation + suppression locale + sync GitHub
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.currentTarget.dataset.id;
      if (!window.confirm('Supprimer cet item définitivement ?')) return;

      const { items } = load();
      const updatedItems = items.filter(i => i.id !== id);

      // Persistance locale immédiate + re-render
      save(updatedItems);
      renderBacklog(container);

      // Synchronisation GitHub en arrière-plan
      try {
        await pushToGitHub(updatedItems);
      } catch {
        showToast('Mode hors-ligne — données non synchronisées');
      }
    });
  });
}
