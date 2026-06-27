// M-STORE : persistance localStorage (cache) + synchronisation GitHub via /api/backlog

const KEY = 'factory_backlog';
const SHA_KEY = 'factory_backlog_sha';

// SHA courant du fichier GitHub, nécessaire pour les mises à jour (PUT).
// Initialisé depuis localStorage au chargement du module.
let _sha = null;
try {
  const stored = localStorage.getItem(SHA_KEY);
  if (stored) _sha = stored;
} catch {
  // Contexte dégradé (ex: navigateur privé strict) — on ignore
}

/**
 * Vérifie qu'un objet a la forme minimale attendue d'un item backlog.
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

// ── Synchronisation GitHub ────────────────────────────────────────────────────

/**
 * Lit le backlog depuis GitHub via /api/backlog.
 * Met à jour le cache localStorage et le SHA interne si succès.
 * @returns {Promise<{ items: Object[], sha: string|null }>}
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

  // Mettre à jour le SHA et le cache local
  _sha = data.sha || null;
  try {
    if (_sha) localStorage.setItem(SHA_KEY, _sha);
  } catch {
    // ignore
  }

  if (Array.isArray(data.items)) {
    save(data.items);
  }

  return { items: data.items || [], sha: data.sha };
}

/**
 * Écrit le backlog sur GitHub via /api/backlog (PUT).
 * Utilise le SHA stocké pour les mises à jour (requis par l'API GitHub).
 * Met à jour le SHA interne si succès.
 * @param {Object[]} items
 * @returns {Promise<{ sha: string }>}
 * @throws {Error} en cas d'erreur réseau ou conflit de SHA
 */
export async function pushToGitHub(items) {
  const res = await fetch('/api/backlog', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, sha: _sha }),
  });

  if (!res.ok) {
    throw new Error(`PUT /api/backlog a échoué (${res.status})`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  // Mettre à jour le SHA après une écriture réussie
  if (data.sha) {
    _sha = data.sha;
    try {
      localStorage.setItem(SHA_KEY, _sha);
    } catch {
      // ignore
    }
  }

  return data;
}
