// M-SYNC : File d'attente offline + flushPending()
//
// Dépendance circulaire avec store.js intentionnelle et sûre (§9.3 architecture.md) :
// les imports sont des live bindings accédés uniquement dans les corps de fonctions,
// jamais au top-level — les deux modules sont stables au moment où les fonctions s'exécutent.

import { load, pushToGitHub } from './store.js';

const PENDING_KEY = 'factory_pending';

/** Garde de réentrance : un seul PUT simultané (§9.2 / §11 risques) */
let flushing = false;

// ── État réseau ───────────────────────────────────────────────────────────────

/**
 * Retourne l'état de connexion réseau.
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine;
}

// ── File d'attente factory_pending ────────────────────────────────────────────

/**
 * Lit la file d'attente depuis localStorage.
 * Retourne {} si absente, nulle, ou corrompue.
 * @returns {{ [id: string]: { op: string, queuedAt: string } }}
 */
export function getPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Ajoute ou écrase une entrée dans la file d'attente.
 * Anti-doublon garanti : indexée par id — remuter le même item écrase l'entrée existante.
 * @param {string} id
 * @param {string} [op='upsert']
 */
export function enqueue(id, op = 'upsert') {
  const pending = getPending();
  pending[id] = { op, queuedAt: new Date().toISOString() };
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch (e) {
    console.error('[sync] Erreur enqueue:', e);
  }
}

/**
 * Retourne true si id est présent dans la file d'attente.
 * @param {string} id
 * @returns {boolean}
 */
export function isPending(id) {
  return Object.prototype.hasOwnProperty.call(getPending(), id);
}

/**
 * Retourne true si la file contient au moins une entrée.
 * @returns {boolean}
 */
export function hasPending() {
  return Object.keys(getPending()).length > 0;
}

/**
 * Vide la file d'attente dans localStorage.
 */
export function clearPending() {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({}));
  } catch (e) {
    console.error('[sync] Erreur clearPending:', e);
  }
}

// ── Synchronisation ───────────────────────────────────────────────────────────

/**
 * Synchronise l'état local complet vers Redis si en ligne et file non vide.
 *
 * Algorithme (§9.2 architecture.md) :
 * 1. Garde de réentrance — no-op si flushing est déjà true (double flush au boot/online)
 * 2. Offline — no-op si !navigator.onLine ; la file est conservée pour le prochain event online
 * 3. File vide — no-op
 * 4. Reconstitue l'état complet depuis localStorage (last-write-wins)
 * 5. Court-circuit si items.length === 0 : PUT rejeté 400 côté serveur — vider la file sans PUT
 * 6. PUT vers /api/backlog : clearPending si succès, file conservée si échec réseau/serveur
 *
 * @returns {Promise<void>}
 */
export async function flushPending() {
  if (flushing) return;
  if (!isOnline()) return;
  if (!hasPending()) return;

  flushing = true;
  try {
    const { items } = load();

    if (items.length === 0) {
      // Le PUT rejette les tableaux vides (400) — vider la file sans PUT (§11 risques)
      clearPending();
      return;
    }

    await pushToGitHub(items);
    clearPending();
  } catch (e) {
    // Échec réseau ou serveur : log silencieux, file conservée pour réessai au prochain event online
    console.error('[sync] Erreur flush — file conservée pour réessai:', e);
  } finally {
    flushing = false;
  }
}
