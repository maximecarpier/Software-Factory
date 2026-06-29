// M-STORE : persistance localStorage (cache) + synchronisation Redis via /api/backlog
//
// Importe sync.js en namespace (import * as) pour que les jest.spyOn sur les exports
// de sync.js soient visibles depuis ce module (les deux partagent le même namespace object).
// Dépendance circulaire avec sync.js : sûre car les fonctions sync ne sont appelées
// qu'à l'intérieur des corps de fonction, jamais au top-level.

import * as syncModule from './sync.js';

const KEY = 'factory_backlog';

/**
 * Vérifie qu'un objet a la forme minimale attendue d'un item backlog.
 * Le champ `statut` est optionnel (ajouté récemment, absent des anciens items).
 */
function isValidItem(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.titre === 'string' &&
    typeof item.priorite === 'string' &&
    typeof item.createdAt === 'string'
  );
}

/**
 * Charge les items depuis localStorage.
 * Si le contenu est absent → retourne un tableau vide.
 * Si le contenu est corrompu ou de forme invalide → reset silencieux + corrupted=true.
 * @returns {{ items: Object[], corrupted: boolean }}
 */
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return { items: [], corrupted: false };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidItem)) {
      localStorage.setItem(KEY, JSON.stringify([]));
      return { items: [], corrupted: true };
    }
    return { items: parsed, corrupted: false };
  } catch {
    try {
      localStorage.setItem(KEY, JSON.stringify([]));
    } catch {
      // Quota ou contexte dégradé — on ignore silencieusement
    }
    return { items: [], corrupted: true };
  }
}

/**
 * Retourne tous les items sans le flag corrupted.
 * Raccourci pratique pour les vues qui n'ont pas besoin du flag.
 * @returns {Object[]}
 */
export function getAll() {
  return load().items;
}

/**
 * Écrase le stockage localStorage avec le tableau fourni.
 * Opération synchrone, immédiate. Utiliser pour toutes les mutations locales.
 * @param {Object[]} items
 */
export function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[store] Erreur écriture localStorage:', e);
  }
}

/**
 * Ajoute un item au cache local, puis enfile la mutation et déclenche le flush (fire-and-forget).
 * L'item est immédiatement disponible hors-ligne ; la sync réseau est opportuniste.
 * @param {Object} item
 */
export function add(item) {
  try {
    const { items } = load();
    items.push(item);
    save(items);
    syncModule.enqueue(item.id, 'upsert');
    syncModule.flushPending().catch(e => {
      console.error('[store] Background flush error (add):', e);
    });
  } catch (e) {
    console.error('[store] Erreur add:', e);
  }
}

/**
 * Remplace un item existant (même id) dans le cache local.
 * Si l'item n'existe pas, la mise à jour est ignorée (soft skip — upsert-like).
 * Enfile la mutation et déclenche le flush (fire-and-forget).
 * @param {Object} item
 */
export function update(item) {
  try {
    const { items } = load();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      items[idx] = item;
    }
    save(items);
    syncModule.enqueue(item.id, 'upsert');
    syncModule.flushPending().catch(e => {
      console.error('[store] Background flush error (update):', e);
    });
  } catch (e) {
    console.error('[store] Erreur update:', e);
  }
}

/**
 * Retire un item du cache local, enfile la suppression et déclenche le flush.
 * @param {string} id
 */
export function remove(id) {
  try {
    const { items } = load();
    save(items.filter(i => i.id !== id));
    syncModule.enqueue(id, 'delete');
    syncModule.flushPending().catch(e => {
      console.error('[store] Background flush error (remove):', e);
    });
  } catch (e) {
    console.error('[store] Erreur remove:', e);
  }
}

// ── Synchronisation Redis ─────────────────────────────────────────────────────

/**
 * Lit le backlog depuis Redis via /api/backlog.
 * Met à jour le cache localStorage si succès.
 * Nom conservé pour compatibilité avec les vues existantes.
 * @returns {Promise<{ items: Object[] }>}
 * @throws {Error} en cas d'erreur réseau ou serveur
 */
export async function fetchFromGitHub() {
  const res = await fetch('/api/backlog');
  if (!res.ok) {
    throw new Error(`GET /api/backlog a échoué (${res.status})`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  if (Array.isArray(data.items)) {
    save(data.items);
  }

  return { items: data.items || [] };
}

/**
 * Écrit le backlog dans Redis via /api/backlog (PUT).
 * Nom conservé pour compatibilité avec les vues existantes.
 * @param {Object[]} items
 * @returns {Promise<{ ok: true }>}
 * @throws {Error} en cas d'erreur réseau ou serveur
 */
export async function pushToGitHub(items) {
  const res = await fetch('/api/backlog', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    throw new Error(`PUT /api/backlog a échoué (${res.status})`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}
