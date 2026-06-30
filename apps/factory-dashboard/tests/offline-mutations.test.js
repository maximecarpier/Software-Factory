/**
 * Tests TDD — Offline mutations (4 bugs critiques)
 *
 * Ces tests doivent ÉCHOUER avec le code bugué actuel et PASSER après les correctifs.
 *
 * Correctifs attendus :
 *  - formView.js     handleSubmit → store.add() / store.update() au lieu de save() + pushToGitHub()
 *  - backlogView.js  statut change → store.update() au lieu de save() + pushToGitHub()
 *  - backlogView.js  delete handler → store.remove(id) au lieu de save() + pushToGitHub()
 *  - sync.js         flushPending() → envoie PUT même quand items=[], pas de clearPending() silencieux
 */

import * as store from '../src/store.js';
import * as sync from '../src/sync.js';
import { renderForm } from '../src/views/formView.js';
import { renderBacklog } from '../src/views/backlogView.js';
import { createItem } from '../src/model.js';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  global.navigator.onLine = true;
  global.confirm = jest.fn(() => true);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  });
  let uuidCounter = 0;
  global.crypto.randomUUID = () => `test-uuid-${uuidCounter++}`;
  document.body.innerHTML = '<div id="app"></div>';
});

async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 20));
}

// ─── Bug 3 — sync.js:122 ─────────────────────────────────────────────────────
// flushPending() vide la file SANS PUT quand localStorage est vide
// Correctif : supprimer le court-circuit items.length===0 et laisser le PUT passer

describe('Bug 3 — sync.flushPending() : doit envoyer PUT même quand items=[]', () => {
  it('Given file non vide + localStorage vide, When flushPending, Then PUT /api/backlog est appelé', async () => {
    // Simule : tous les items supprimés offline → cache vide, file non vide
    sync.enqueue('item-supprimé-offline', 'upsert');
    store.save([]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await sync.flushPending();

    // ATTENDU après fix : PUT envoyé avec items: []
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/backlog',
      expect.objectContaining({ method: 'PUT' })
    );
    // File vidée après succès
    expect(sync.hasPending()).toBe(false);
  });

  it('Given file non vide + localStorage vide, When PUT échoue (500), Then file conservée', async () => {
    sync.enqueue('item-offline', 'upsert');
    store.save([]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    await sync.flushPending();

    // File conservée car PUT a échoué — données récupérables au prochain flush
    expect(sync.hasPending()).toBe(true);
  });
});

// ─── Bug 1a — formView.js — création offline ─────────────────────────────────
// handleSubmit appelle save() + pushToGitHub() directement, jamais store.add()
// Correctif : remplacer par store.add(newItem)

describe('Bug 1a — formView création offline : factory_pending contient le nouvel item', () => {
  it('Given offline, When projet créé via formulaire, Then hasPending()=true', async () => {
    global.navigator.onLine = false;
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    const container = document.getElementById('app');
    renderForm(container, null);

    document.querySelector('#toggle-type .toggle-btn[data-value="projet"]').click();
    document.getElementById('field-titre').value = 'Projet Créé Offline';
    document.querySelector('#toggle-priorite .toggle-btn[data-value="haute"]').click();

    document.getElementById('item-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await flushPromises();

    // ATTENDU après fix : store.add() → enqueue() → hasPending() = true
    expect(sync.hasPending()).toBe(true);
    // Item persisté localement
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].titre).toBe('Projet Créé Offline');
  });
});

// ─── Bug 1b — formView.js — édition offline ──────────────────────────────────
// handleSubmit appelle save() + pushToGitHub() directement, jamais store.update()
// Correctif : remplacer par store.update(updatedItem)

describe('Bug 1b — formView édition offline : factory_pending contient l\'item modifié', () => {
  it('Given offline, When item existant modifié via formulaire, Then hasPending()=true', async () => {
    global.navigator.onLine = false;

    const existing = createItem({
      type: 'projet',
      titre: 'Titre Original',
      description: null,
      priorite: 'haute',
    });
    store.save([existing]);
    sync.clearPending();

    const container = document.getElementById('app');
    renderForm(container, existing.id);

    document.getElementById('field-titre').value = 'Titre Modifié';

    document.getElementById('item-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await flushPromises();

    // ATTENDU après fix : store.update() → enqueue() → hasPending() = true
    expect(sync.hasPending()).toBe(true);
    expect(sync.getPending()).toHaveProperty(existing.id);
    // Modification persistée localement
    expect(store.getAll()[0].titre).toBe('Titre Modifié');
  });
});

// ─── Bug 2 — backlogView.js — changement de statut offline ───────────────────
// v3 : le statut est modifié via swipe-droite → store.update({ ...item, statut: 'terminé' })
// Le test appelle directement store.update() (même chemin qu'un swipe validé)

describe('Bug 2 — backlogView statut offline : factory_pending contient l\'item modifié', () => {
  it('Given offline, When statut changé sur un item, Then hasPending()=true', async () => {
    global.navigator.onLine = false;

    const item = createItem({
      type: 'projet',
      titre: 'Test Statut',
      description: null,
      priorite: 'haute',
    });
    store.save([item]);
    sync.clearPending();

    // v3 : le swipe-droite appelle store.update({ ...item, statut: 'terminé' })
    store.update({ ...item, statut: 'terminé' });
    await flushPromises();

    // ATTENDU : store.update() → enqueue() → hasPending() = true
    expect(sync.hasPending()).toBe(true);
    expect(sync.getPending()).toHaveProperty(item.id);
    // Modification persistée localement
    expect(store.getAll()[0].statut).toBe('terminé');
  });
});

// ─── Bug 4 — suppression offline ─────────────────────────────────────────────
// v3 : la suppression est déclenchée depuis formView (bouton Supprimer) → store.remove(id)
// Le test appelle directement store.remove() (même chemin qu'une suppression confirmée)

describe('Bug 4 — backlogView suppression offline : factory_pending contient la suppression', () => {
  it('Given offline, When item supprimé, Then hasPending()=true', async () => {
    global.navigator.onLine = false;

    const item = createItem({
      type: 'projet',
      titre: 'À Supprimer',
      description: null,
      priorite: 'haute',
    });
    store.save([item]);
    sync.clearPending();

    // v3 : formView appelle store.remove(id) après confirmation
    store.remove(item.id);
    await flushPromises();

    // Item supprimé localement
    expect(store.getAll()).toHaveLength(0);
    // ATTENDU : store.remove() → enqueue() → hasPending() = true
    expect(sync.hasPending()).toBe(true);
  });

  it('Given offline, When dernier item supprimé, Then hasPending()=true (suppression syncée au retour réseau)', async () => {
    global.navigator.onLine = false;

    const item = createItem({
      type: 'projet',
      titre: 'Dernier Item',
      description: null,
      priorite: 'haute',
    });
    store.save([item]);
    sync.clearPending();

    // v3 : formView appelle store.remove(id) après confirmation
    store.remove(item.id);
    await flushPromises();

    expect(store.getAll()).toHaveLength(0);
    // La file non vide garantit que le prochain flush enverra items:[] à Redis
    expect(sync.hasPending()).toBe(true);
  });
});
