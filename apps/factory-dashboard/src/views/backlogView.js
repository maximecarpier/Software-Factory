// M-F2 v3 : vue backlog — filter strip chips + search + swipe + skeleton

import { load, update } from '../store.js';
import { applySort } from '../model.js';
import { showToast } from '../components/toast.js';

// ── État local (non persisté, reset à chaque rechargement de page) ────────────
const state = {
  searchQuery: '',
  activeTypes: new Set(['projet', 'feature']),
  activePrios: new Set(['haute', 'moyenne', 'basse']),
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

/**
 * Vérifie si un item a une mutation locale en attente de sync (lecture directe
 * de la clé factory_pending pour éviter d'importer sync.js dans les vues).
 */
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

// ── Filtrage inline (applyFilters de model.js ne supporte pas le multi-select) ─

/**
 * Filtre les items selon les chips actifs + recherche full-text.
 * Masque aussi les items "terminé" (ils quittent le backlog après swipe).
 */
function applyLocalFilters(items) {
  const q = state.searchQuery.trim().toLowerCase();
  return items.filter(item => {
    // Les items "terminé" n'appartiennent plus au backlog actif
    if ((item.statut || 'à faire') === 'terminé') return false;
    // Chips type
    if (!state.activeTypes.has(item.type)) return false;
    // Chips priorité
    if (!state.activePrios.has(item.priorite)) return false;
    // Recherche full-text (AND avec chips)
    if (q) {
      const inTitle = item.titre.toLowerCase().includes(q);
      const inDesc = item.description ? item.description.toLowerCase().includes(q) : false;
      if (!inTitle && !inDesc) return false;
    }
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
        <div class="skeleton-card" style="height:36px;margin-bottom:10px"></div>
        <div class="chip-row">
          <div class="skeleton-card" style="width:70px;height:32px;border-radius:999px"></div>
          <div class="skeleton-card" style="width:80px;height:32px;border-radius:999px"></div>
        </div>
      </div>
      <div class="card-list">${cards}</div>
    </div>
  `;
}

function buildFilterStrip(total, shown) {
  const typeChips = [
    { value: 'projet', label: 'Projet' },
    { value: 'feature', label: 'Feature' },
  ].map(({ value, label }) =>
    `<button class="chip${state.activeTypes.has(value) ? ' active' : ''}" data-filter="type" data-value="${value}">${label}</button>`
  ).join('');

  const prioChips = [
    { value: 'haute', label: 'Haute' },
    { value: 'moyenne', label: 'Moyenne' },
    { value: 'basse', label: 'Basse' },
  ].map(({ value, label }) =>
    `<button class="chip${state.activePrios.has(value) ? ' active' : ''}" data-filter="prio" data-value="${value}">${label}</button>`
  ).join('');

  const countLabel = total === 0
    ? ''
    : shown === total
      ? `${shown} item${shown !== 1 ? 's' : ''}`
      : `${shown} item${shown !== 1 ? 's' : ''} sur ${total}`;

  return `
    <div class="filter-strip">
      <div class="search-bar-wrapper">
        <svg class="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="search" class="search-bar" placeholder="Rechercher…" id="search-input" value="${escapeHtml(state.searchQuery)}" autocomplete="off">
      </div>
      <div class="chip-row">
        ${typeChips}
        <span class="chip-separator"></span>
        ${prioChips}
      </div>
      <div class="filter-count" id="filter-count">${countLabel}</div>
    </div>
  `;
}

function buildCard(item, allItems) {
  const desc = item.description ? truncate(item.description, 120) : null;
  const prioClass = `card-prio-${escapeHtml(item.priorite)}`;

  let projectBadge = '';
  if (item.type === 'feature' && item.projectId) {
    const parent = allItems.find(i => i.id === item.projectId);
    if (parent) {
      projectBadge = `<span class="badge badge-projet">${escapeHtml(parent.titre)}</span>`;
    }
  }

  const syncIndicator = isPendingItem(item.id)
    ? `<span class="sync-indicator" title="En attente de sync">⏳</span>`
    : '';

  return `
    <div class="swipe-wrapper">
      <div class="swipe-action-left">✓ Terminé</div>
      <div class="swipe-action-right">✏ Éditer</div>
      <div class="card ${prioClass}" data-id="${escapeHtml(item.id)}">
        <div class="card-prio-stripe"></div>
        <div class="card-body">
          <div class="card-meta">
            <span class="badge">${escapeHtml(item.type.toUpperCase())}</span>
            ${projectBadge}
            ${syncIndicator}
          </div>
          <div class="card-title">${escapeHtml(item.titre)}</div>
          ${desc ? `<div class="card-desc">${escapeHtml(desc)}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ── Points d'entrée publics ───────────────────────────────────────────────────

/**
 * Affiche 4 cartes skeleton. À appeler depuis le router ou main.js
 * avant le fetch initial pour éviter l'écran blanc pendant le chargement réseau.
 * @param {HTMLElement} container
 */
export function renderBacklogSkeleton(container) {
  container.innerHTML = buildSkeletonHTML();
}

/**
 * Rend la vue backlog complète (filter strip + cartes + états vides).
 * Au premier appel, affiche le skeleton 1 frame avant les vraies données.
 * @param {HTMLElement} container — typiquement #app
 */
export async function renderBacklog(container) {
  // Skeleton visible 1 frame au premier rendu (avant que le réseau ait répondu)
  if (isFirstRender) {
    isFirstRender = false;
    renderBacklogSkeleton(container);
    await new Promise(r => requestAnimationFrame(r));
  }

  const { items: allItems, corrupted } = load();

  const filtered = applyLocalFilters(allItems);
  const sorted = applySort(filtered, state.sortKey);

  const corruptedBanner = corrupted
    ? `<div class="banner-warning" role="alert">Données locales illisibles, backlog réinitialisé.</div>`
    : '';

  let innerContent;

  if (allItems.length === 0 || applyLocalFilters(allItems).length === 0 && state.searchQuery === '' && state.activeTypes.size === 2 && state.activePrios.size === 3) {
    // État vide absolu — aucun item dans le store (hors terminé)
    innerContent = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p class="empty-title">Aucun item dans le backlog.</p>
        <p class="empty-sub">Commence par ajouter un item.</p>
      </div>
    `;
  } else {
    const stripHtml = buildFilterStrip(allItems.filter(i => (i.statut || 'à faire') !== 'terminé').length, sorted.length);

    if (sorted.length === 0) {
      // État vide filtré — chips/recherche exclut tout
      innerContent = stripHtml + `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p class="empty-title">Aucun item ne correspond à ces filtres.</p>
          <button class="btn-secondary" id="reset-filters">Réinitialiser les filtres</button>
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

  // Fade-in de la liste (200ms) après que le DOM soit peint
  const cardList = container.querySelector('.card-list');
  if (cardList) {
    requestAnimationFrame(() => {
      cardList.style.transition = 'opacity 200ms ease';
      cardList.style.opacity = '1';
    });
  }

  bindFilterEvents(container);
  bindSwipeGestures(container, sorted, allItems);
}

// ── Événements ────────────────────────────────────────────────────────────────

function bindFilterEvents(container) {
  const searchInput = container.querySelector('#search-input');
  const resetBtn = container.querySelector('#reset-filters');
  const chips = container.querySelectorAll('.chip[data-filter]');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      renderBacklog(container);
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      const value = chip.dataset.value;

      if (filter === 'type') {
        toggleChip(state.activeTypes, value, ['projet', 'feature']);
      } else if (filter === 'prio') {
        toggleChip(state.activePrios, value, ['haute', 'moyenne', 'basse']);
      }
      renderBacklog(container);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.searchQuery = '';
      state.activeTypes = new Set(['projet', 'feature']);
      state.activePrios = new Set(['haute', 'moyenne', 'basse']);
      renderBacklog(container);
    });
  }
}

/**
 * Toggle un chip dans un Set. Si la suppression viderait le Set → réactiver tout.
 * @param {Set} set
 * @param {string} value
 * @param {string[]} allValues
 */
function toggleChip(set, value, allValues) {
  if (set.has(value)) {
    set.delete(value);
    if (set.size === 0) {
      allValues.forEach(v => set.add(v));
    }
  } else {
    set.add(value);
  }
}

// ── Swipe gestures ────────────────────────────────────────────────────────────

function bindSwipeGestures(container, sortedItems, allItems) {
  container.querySelectorAll('.swipe-wrapper').forEach((wrapper, idx) => {
    const item = sortedItems[idx];
    if (!item) return;
    const card = wrapper.querySelector('.card');
    if (!card) return;

    let startX = 0;
    let startY = 0;
    let swiping = false;

    wrapper.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = false;
    }, { passive: true });

    wrapper.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
        swiping = true;
        card.style.willChange = 'transform';
      }
      if (swiping) {
        e.preventDefault();
        card.style.transform = `translateX(${dx}px)`;
      }
    }, { passive: false });

    wrapper.addEventListener('touchend', e => {
      if (!swiping) return;
      card.style.willChange = '';
      const dx = e.changedTouches[0].clientX - startX;

      if (dx > 80) {
        // TERMINÉ — mise à jour store + collapse animé + toast
        update({ ...item, statut: 'terminé' });
        if ('vibrate' in navigator) navigator.vibrate(20);
        const h = wrapper.offsetHeight;
        wrapper.style.maxHeight = `${h}px`;
        wrapper.style.overflow = 'hidden';
        // Force reflow pour que la transition de maxHeight parte d'une valeur connue
        void wrapper.getBoundingClientRect();
        wrapper.style.transition = 'opacity 250ms ease-in, max-height 250ms ease-in';
        wrapper.style.opacity = '0';
        wrapper.style.maxHeight = '0';
        setTimeout(() => wrapper.remove(), 260);
        showToast('Terminé ✓', 'success');
      } else if (dx < -80) {
        // ÉDITER — snap-back spring puis navigation
        if ('vibrate' in navigator) navigator.vibrate(10);
        card.style.transition = 'transform var(--transition-spring)';
        card.style.transform = 'translateX(0)';
        setTimeout(() => { card.style.transition = ''; }, 310);
        window.location.hash = `#/edit/${item.id}`;
      } else {
        // En dessous du seuil — snap-back spring
        card.style.transition = 'transform var(--transition-spring)';
        card.style.transform = 'translateX(0)';
        setTimeout(() => { card.style.transition = ''; }, 310);
      }
      swiping = false;
    }, { passive: true });
  });
}
