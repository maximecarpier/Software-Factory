// M-MODEL : logique pure sans DOM — createItem, validateItem, applyFilters, applySort

export const TYPES = ['projet', 'feature'];
export const PRIORITES = ['haute', 'moyenne', 'basse'];
export const PRIORITE_RANK = { haute: 3, moyenne: 2, basse: 1 };

/**
 * Génère un identifiant unique via crypto.randomUUID() avec fallback Date.now().
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}

/**
 * Crée un item backlog complet à partir des données du formulaire.
 * @param {{ type: string, titre: string, description: string|null, priorite: string, projectId?: string }} fields
 * @returns {Object} Item complet avec id et createdAt
 */
export function createItem({ type, titre, description, priorite, projectId, url }) {
  const item = {
    id: generateId(),
    type,
    titre: titre.trim(),
    description: description && description.trim() !== '' ? description.trim() : null,
    priorite,
    statut: 'à faire',
    createdAt: new Date().toISOString(),
  };
  // projectId uniquement pour les features avec un projet parent défini
  if (type === 'feature' && projectId) {
    item.projectId = projectId;
  }
  // url uniquement pour les projets
  if (type === 'projet' && url) {
    item.url = url;
  }
  return item;
}

/**
 * Valide les données du formulaire selon les règles fonctionnelles (specs §4.3).
 * Pour les features, valide aussi projectId contre la liste des projets existants.
 * @param {{ type: string, titre: string, description: string|null, priorite: string, projectId?: string }} fields
 * @param {Object[]} allItems - tableau complet des items pour valider le projet parent
 * @returns {{ ok: boolean, errors: Object.<string, string> }}
 */
export function validateItem({ type, titre, description, priorite, projectId }, allItems = []) {
  const errors = {};

  if (!type || !TYPES.includes(type)) {
    errors.type = 'Veuillez sélectionner un type.';
  }

  if (!titre || titre.trim() === '') {
    errors.titre = 'Le titre est obligatoire.';
  } else if (titre.trim().length > 100) {
    errors.titre = 'Le titre ne peut pas dépasser 100 caractères.';
  }

  if (description && description.length > 1000) {
    errors.description = 'La description ne peut pas dépasser 1 000 caractères.';
  }

  if (!priorite || !PRIORITES.includes(priorite)) {
    errors.priorite = 'Veuillez sélectionner une priorité.';
  }

  // Une feature doit obligatoirement être liée à un projet existant
  if (type === 'feature') {
    const projects = allItems.filter(i => i.type === 'projet');
    if (projects.length === 0) {
      errors.projectId = "Aucun projet disponible. Créez d'abord un projet.";
    } else if (!projectId || !projects.find(p => p.id === projectId)) {
      errors.projectId = 'Veuillez sélectionner un projet parent.';
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Applique des filtres cumulatifs (AND) sur un tableau d'items.
 * Une valeur vide ou absente signifie "pas de filtre sur ce champ".
 * @param {Object[]} items
 * @param {{ type?: string, priorite?: string, statut?: string }} filters
 * @returns {Object[]}
 */
export function applyFilters(items, { type, priorite, statut } = {}) {
  return items.filter(item => {
    const matchType = !type || item.type === type;
    const matchPriorite = !priorite || item.priorite === priorite;
    const matchStatut = !statut || (item.statut || 'à faire') === statut;
    return matchType && matchPriorite && matchStatut;
  });
}

/**
 * Trie un tableau d'items selon la clé de tri fournie.
 * Ne mute pas le tableau source.
 * @param {Object[]} items
 * @param {'recent'|'ancien'|'prio-desc'|'prio-asc'} sortKey
 * @returns {Object[]}
 */
export function applySort(items, sortKey) {
  const sorted = [...items];
  switch (sortKey) {
    case 'recent':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'ancien':
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'prio-desc':
      sorted.sort((a, b) => PRIORITE_RANK[b.priorite] - PRIORITE_RANK[a.priorite]);
      break;
    case 'prio-asc':
      sorted.sort((a, b) => PRIORITE_RANK[a.priorite] - PRIORITE_RANK[b.priorite]);
      break;
    default:
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return sorted;
}
