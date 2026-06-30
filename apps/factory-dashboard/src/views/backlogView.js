// M-F2 v3 : vue backlog — filtres 3 lignes + pas de swipe + bouton terminé + clic édition

import { load, update } from '../store.js';
import { applySort } from '../model.js';
import { showToast } from '../components/toast.js';

// ── État local ────────────────────────────────────────────────────────────────
const state = {
  activeTypes:   new Set(['projet', 'feature']),
  activePrios:   new Set(['haute', 'moyenne', 'basse']),
  activeStatuts: new Set(['à faire', 'en cours']),
  sortKey: 'recent',
};

let isFirstRender = true;

// ── Utilitaires ───────────────────────────────────────────────────────────────
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isPendingItem(id) {
  try {
    const raw = localStorage.getItem('factory_pending');
    if (!raw) return false;
    const pending = JSON.parse(raw);
    return id in pending;
  } catch {
    return false;
  }
}

// ── Filtrage ──────────────────────────────────────────────────────────────────
function applyLocalFilters(items) {
  return items.filter(item => {
    const statut = item.statut || 'à faire';
    if (!state.activeStatuts.has(statut)) return false;
    if (!state.activeTypes.has(item.type)) return false;
    if (!state.activePrios.has(item.priorite)) return false;
    return true;
  });
}

// ── Générateurs HTML ──────────────────────────────────────────────────────────
function buildSkeletonHTML() {
  const cards = Array.from({ length: 4 }, () => `
    <div class="skeleton-card">
      <div class="skel-badge"></div>
      <div class="skel-line-lg"></div>
      <div class="skel-line-sm"></div>
    </div>
  `).join('');
  return `
    <div class="backlog-container">
      <div class="filter-strip">
        <div class="chip-row"><div class="skeleton-card" style="width:70px;height:32px;border-radius:999px"></div></div>
      </div>
      <div class="card-list">${cards}</div>
    </div>
  `;
}

function chipRow(label, chips) {
  return `
    <div class="filter-row">
      <span class="filter-row-label">${escapeHtml(label)}</span>
      <div class="chip-row">${chips}</div>
    </div>
  `;
}

function buildFilterStrip(total, shown) {
  const typeChips = [
    { value: 'projet',  label: 'Projet' },
    { value: 'feature', label: 'Feature' },
  ].map(({ value, label }) =>
    `<button class="chip${state.activeTypes.has(value) ? ' active' : ''}" data-filter="type" data-value="${value}">${label}</button>`
  ).join('');

  const prioChips = [
    { value: 'basse',   label: 'Basse' },
    { value: 'moyenne', label: 'Moyenne' },
    { value: 'haute',   label: 'Haute' },
  ].map(({ value, label }) =>
    `<button class="chip${state.activePrios.has(value) ? ' active' : ''}" data-filter="prio" data-value="${value}">${label}</button>`
  ).join('');

  const statutChips = [
    { value: 'à faire',  label: 'À faire' },
    { value: 'en cours', label: 'En cours' },
    { value: 'terminé',  label: 'Terminé' },
  ].map(({ value, label }) =>
    `<button class="chip${state.activeStatuts.has(value) ? ' active' : ''}" data-filter="statut" data-value="${value}">${label}</button>`
  ).join('');

  const countLabel = total === 0
    ? ''
    : shown === total
      ? `${shown} item${shown !== 1 ? 's' : ''}`
      : `${shown} / ${total}`;

  return `
    <div class="filter-strip">
      ${chipRow('Type', typeChips)}
      ${chipRow('Priorité', prioChips)}
      ${chipRow('Statut', statutChips)}
      <div class="filter-count" id="filter-count">${countLabel}</div>
    </div>
  `;
}

function piorLabel(priorite) {
  const map = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };
  return map[priorite] || priorite;
}

function statutLabel(statut) {
  const map = { 'à faire': 'À faire', 'en cours': 'En cours', 'terminé': 'Terminé' };
  return map[statut] || statut;
}

function buildCard(item, allItems) {
  const prioClass  = `card-prio-${escapeHtml(item.priorite)}`;
  const statut     = item.statut || 'à faire';
  const isTermine  = statut === 'terminé';

  let projectBadge = '';
  if (item.type === 'feature' && item.projectId) {
    const parent = allItems.find(i => i.id === item.projectId);
    if (parent) {
      projectBadge = `<span class="badge badge-project">${escapeHtml(parent.titre)}</span>`;
    }
  }

  const syncIndicator = isPendingItem(item.id)
    ? `<span class="sync-indicator" title="En attente de sync">⏳</span>`
    : '';

  const typeBadgeClass = item.type === 'projet' ? 'badge-projet' : 'badge-feature';

  const doneBtn = isTermine
    ? `<button class="card-done-btn card-done-btn--done" data-id="${escapeHtml(item.id)}" title="Marquer À faire" aria-label="Retirer de terminé">↩</button>`
    : `<button class="card-done-btn" data-id="${escapeHtml(item.id)}" title="Marquer Terminé" aria-label="Marquer comme terminé">✓</button>`;

  return `
    <div class="card ${prioClass}" data-id="${escapeHtml(item.id)}" role="button" tabindex="0" style="cursor:pointer">
      <div class="card-prio-stripe ${prioClass}"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="badge ${typeBadgeClass}">${escapeHtml(item.type.toUpperCase())}</span>
          ${projectBadge}
          ${syncIndicator}
        </div>
        <div class="card-title">${escapeHtml(item.titre)}</div>
        <div class="card-info-row">
          <span class="badge-prio prio-${escapeHtml(item.priorite)}">${piorLabel(item.priorite)}</span>
          <span class="badge-statut statut-${escapeHtml(statut)}">${statutLabel(statut)}</span>
        </div>
      </div>
      <div class="card-actions-right">
        ${doneBtn}
      </div>
    </div>
  `;
}

// ── Points d'entrée publics ───────────────────────────────────────────────────
export function renderBacklogSkeleton(container) {
  container.innerHTML = buildSkeletonHTML();
}

export async function renderBacklog(container) {
  if (isFirstRender) {
    isFirstRender = false;
    renderBacklogSkeleton(container);
    await new Promise(r => requestAnimationFrame(r));
  }

  const { items: allItems, corrupted } = load();
  const filtered = applyLocalFilters(allItems);
  const sorted   = applySort(filtered, state.sortKey);

  const corruptedBanner = corrupted
    ? `<div class="banner-warning" role="alert">Données locales illisibles, backlog réinitialisé.</div>`
    : '';

  let innerContent;

  const totalVisible = allItems.filter(i => {
    const s = i.statut || 'à faire';
    return state.activeStatuts.has(s);
  }).length;

  if (allItems.length === 0) {
    innerContent = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p class="empty-title">Aucun item dans le backlog.</p>
        <p class="empty-sub">Commence par ajouter un item.</p>
      </div>
    `;
  } else {
    const stripHtml = buildFilterStrip(totalVisible, sorted.length);

    if (sorted.length === 0) {
      innerContent = stripHtml + `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p class="empty-title">Aucun item ne correspond.</p>
          <button class="btn-secondary" id="reset-filters">Réinitialiser</button>
        </div>
      `;
    } else {
      const cardsHtml = sorted.map(item => buildCard(item, allItems)).join('');
      innerContent = stripHtml + `
        <div class="card-list" style="opacity:0">${cardsHtml}</div>
      `;
    }
  }

  container.innerHTML = `
    <div class="backlog-container">
      ${corruptedBanner}
      ${innerContent}
    </div>
  `;

  const cardList = container.querySelector('.card-list');
  if (cardList) {
    requestAnimationFrame(() => {
      cardList.style.transition = 'opacity 200ms ease';
      cardList.style.opacity = '1';
    });
  }

  bindFilterEvents(container);
  bindCardEvents(container, sorted, allItems);
}

// ── Événements ────────────────────────────────────────────────────────────────
function bindFilterEvents(container) {
  const resetBtn = container.querySelector('#reset-filters');
  const chips    = container.querySelectorAll('.chip[data-filter]');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      const value  = chip.dataset.value;

      if (filter === 'type') {
        toggleChip(state.activeTypes, value, ['projet', 'feature']);
      } else if (filter === 'prio') {
        toggleChip(state.activePrios, value, ['haute', 'moyenne', 'basse']);
      } else if (filter === 'statut') {
        toggleChip(state.activeStatuts, value, ['à faire', 'en cours', 'terminé']);
      }
      renderBacklog(container);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.activeTypes   = new Set(['projet', 'feature']);
      state.activePrios   = new Set(['haute', 'moyenne', 'basse']);
      state.activeStatuts = new Set(['à faire', 'en cours']);
      renderBacklog(container);
    });
  }
}

function toggleChip(set, value, allValues) {
  if (set.has(value)) {
    set.delete(value);
    if (set.size === 0) allValues.forEach(v => set.add(v));
  } else {
    set.add(value);
  }
}

function bindCardEvents(container, sortedItems, allItems) {
  container.querySelectorAll('.card[data-id]').forEach(card => {
    const id   = card.dataset.id;
    const item = sortedItems.find(i => i.id === id);
    if (!item) return;

    // Bouton ✓ terminé (ne pas propager le clic vers la carte)
    const doneBtn = card.querySelector('.card-done-btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isTermine = (item.statut || 'à faire') === 'terminé';
        const newStatut = isTermine ? 'à faire' : 'terminé';
        update({ ...item, statut: newStatut });
        if ('vibrate' in navigator) navigator.vibrate(20);
        showToast(isTermine ? 'Remis en À faire' : 'Terminé ✓', 'success');
        renderBacklog(container);
      });
    }

    // Clic sur la carte → édition
    card.addEventListener('click', () => {
      window.location.hash = `#/edit/${id}`;
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.hash = `#/edit/${id}`;
      }
    });
  });
}
