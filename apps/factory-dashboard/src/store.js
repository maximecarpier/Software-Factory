// M-STORE : persistance localStorage (cache) + synchronisation Redis via /api/backlog

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
 * Ajoute un item au tableau persisté (localStorage uniquement).
 * @param {Object} item
 */
export function add(item) {
  try {
    const { items } = load();
    items.push(item);
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[store] Erreur écriture localStorage:', e);
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
