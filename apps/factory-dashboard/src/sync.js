// M-SYNC : File d'attente offline + flushPending()
//
// Dépendance circulaire avec store.js intentionnelle et sûre (§9.3 architecture.md) :
// en mode CJS (via babel-jest), les imports sont des références au même objet module.exports —
// late binding garanti puisqu'on n'accède pas aux fonctions au top-level.
//
// Garde de réentrance via flushingPromise (Promise en cours ou null) :
// un second appel concurrent à flushPending() reçoit la MÊME Promise que le premier.
// Cela permet à `await sync.flushPending()` d'attendre la fin d'un flush déjà démarré
// (ex: fire-and-forget depuis store.add), plutôt que de retourner immédiatement.

import { load, pushToGitHub } from './store.js';

const PENDING_KEY = 'factory_pending';

// ── Garde de réentrance ───────────────────────────────────────────────────────
// null = pas de flush en cours ; une Promise = flush actif.
let flushingPromise = null;

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
 * 1. Garde de réentrance — si un flush est déjà en cours, retourne la MÊME Promise
 *    (permet à `await sync.flushPending()` d'attendre un flush fire-and-forget en cours)
 * 2. Offline — no-op si !navigator.onLine ; la file est conservée
 * 3. File vide — no-op
 * 4. Reconstitue l'état complet depuis localStorage (last-write-wins)
 * 5. Court-circuit si items.length === 0 : PUT rejeté 400 côté serveur
 * 6. PUT vers /api/backlog : clearPending si succès, file conservée si échec
 *
 * @returns {Promise<void>}
 */
export async function flushPending() {
  // Si un flush est déjà en cours, retourner la même Promise pour que l'appelant
  // puisse await sa complétion (y compris un flush fire-and-forget depuis store.add).
  if (flushingPromise !== null) return flushingPromise;
  if (!isOnline()) return;
  if (!hasPending()) return;

  const doFlush = async () => {
    try {
      const { items } = load();

      await pushToGitHub(items);
      clearPending();
    } catch (e) {
      // Échec réseau ou serveur : log silencieux, file conservée pour réessai au prochain event online
      console.error('[sync] Erreur flush — file conservée pour réessai:', e);
    } finally {
      flushingPromise = null;
    }
  };

  flushingPromise = doFlush();
  return flushingPromise;
}
