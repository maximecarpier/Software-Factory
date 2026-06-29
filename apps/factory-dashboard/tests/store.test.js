/**
 * Tests M-STORE : Persistance locale + modifications offline
 *
 * Cas couverts :
 * - load() : lecture et validation du cache
 * - add() : ajout avec enqueue + flushPending
 * - update() : modification avec enqueue + flushPending
 * - save() : persistance locale
 * - Intégration offline : file conservée après mutations
 */

import * as store from '../src/store.js';
import * as sync from '../src/sync.js';

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  global.navigator.onLine = true;

  // Réinitialiser crypto
  let uuidCounter = 0;
  global.crypto.randomUUID = () => `test-uuid-${uuidCounter++}`;

  // Mock fetch
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true })
  });
});

describe('M-STORE — Persistance locale et offline', () => {
  describe('load()', () => {
    it('retourne items vide et corrupted=false si localStorage vide', () => {
      const result = store.load();

      expect(result.items).toEqual([]);
      expect(result.corrupted).toBe(false);
    });

    it('charge et parse les items depuis localStorage', () => {
      const items = [
        {
          id: 'uuid-1',
          type: 'projet',
          titre: 'Test',
          priorite: 'haute',
          createdAt: '2026-06-29T10:00:00Z'
        }
      ];

      localStorage.setItem('factory_backlog', JSON.stringify(items));
      const result = store.load();

      expect(result.items).toEqual(items);
      expect(result.corrupted).toBe(false);
    });

    it('reset et retourne corrupted=true si contenu invalide (pas un array)', () => {
      localStorage.setItem('factory_backlog', JSON.stringify({ invalid: true }));

      const result = store.load();

      expect(result.items).toEqual([]);
      expect(result.corrupted).toBe(true);
    });

    it('reset et retourne corrupted=true si contenu corrompu (item invalide)', () => {
      const invalid = [
        {
          id: 'uuid-1',
          type: 'projet',
          // Titre manquant
          priorite: 'haute'
        }
      ];

      localStorage.setItem('factory_backlog', JSON.stringify(invalid));
      const result = store.load();

      expect(result.items).toEqual([]);
      expect(result.corrupted).toBe(true);
    });

    it('validate strictement les champs requis (id, type, titre, priorite, createdAt)', () => {
      const validItem = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: '2026-06-29T10:00:00Z'
      };

      localStorage.setItem('factory_backlog', JSON.stringify([validItem]));
      const result = store.load();

      expect(result.items).toHaveLength(1);
      expect(result.corrupted).toBe(false);
    });

    it('tolère les champs supplémentaires (description, updatedAt, syncStatus)', () => {
      const itemWithExtras = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: '2026-06-29T10:00:00Z',
        description: 'Extra field',
        updatedAt: '2026-06-29T11:00:00Z',
        syncStatus: 'pending_create'
      };

      localStorage.setItem('factory_backlog', JSON.stringify([itemWithExtras]));
      const result = store.load();

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(itemWithExtras);
      expect(result.corrupted).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('retourne items du cache sans le flag corrupted', () => {
      const items = [
        {
          id: 'uuid-1',
          type: 'projet',
          titre: 'Test',
          priorite: 'haute',
          createdAt: '2026-06-29T10:00:00Z'
        }
      ];

      localStorage.setItem('factory_backlog', JSON.stringify(items));
      const result = store.getAll();

      expect(result).toEqual(items);
      expect(result).not.toHaveProperty('corrupted');
    });

    it('retourne [] si cache vide', () => {
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('save(items)', () => {
    it('écrase localStorage avec le tableau fourni', () => {
      const items = [
        {
          id: 'uuid-1',
          type: 'projet',
          titre: 'Test',
          priorite: 'haute',
          createdAt: '2026-06-29T10:00:00Z'
        }
      ];

      store.save(items);

      const raw = localStorage.getItem('factory_backlog');
      expect(JSON.parse(raw)).toEqual(items);
    });

    it('ne throw pas si localStorage.setItem échoue (quota)', () => {
      const items = [];

      // Mock setItem pour throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        store.save(items);
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });

  describe('add(item) — modifié v2.0', () => {
    it('ajoute un item au cache local', () => {
      const item = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);

      const all = store.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(item);
    });

    it('appelle sync.enqueue avec l\'id de l\'item', () => {
      jest.spyOn(sync, 'enqueue');

      const item = {
        id: 'uuid-enqueue-test',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);

      expect(sync.enqueue).toHaveBeenCalledWith('uuid-enqueue-test', 'upsert');
    });

    it('appelle sync.flushPending() après ajouter', () => {
      jest.spyOn(sync, 'flushPending').mockResolvedValue();

      const item = {
        id: 'uuid-flush-test',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);

      expect(sync.flushPending).toHaveBeenCalled();
    });

    it('specs § F3.2 : en mode offline, item ajouté localement et enqueueé', () => {
      global.navigator.onLine = false;
      jest.spyOn(sync, 'enqueue');

      const item = {
        id: 'uuid-offline-add',
        type: 'projet',
        titre: 'Offline item',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);

      // Item dans le cache
      expect(store.getAll()).toContainEqual(item);

      // Item enqueueé
      expect(sync.enqueue).toHaveBeenCalledWith('uuid-offline-add', 'upsert');
    });

    it('ne throw pas si enqueue ou flushPending échouent', () => {
      jest.spyOn(sync, 'flushPending').mockRejectedValue(new Error('Network'));

      const item = {
        id: 'uuid-test',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      // add() doit complèter sans throw
      expect(() => store.add(item)).not.toThrow();

      // Item quand même ajouté localement
      expect(store.getAll()).toContainEqual(item);
    });
  });

  describe('update(item) — nouveau v2.0', () => {
    it('remplace un item existant par id', () => {
      const item1 = {
        id: 'uuid-to-update',
        type: 'projet',
        titre: 'Original',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item1);

      const updated = {
        ...item1,
        titre: 'Modified',
        priorite: 'basse'
      };

      store.update(updated);

      const all = store.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].titre).toBe('Modified');
      expect(all[0].priorite).toBe('basse');
    });

    it('appelle sync.enqueue avec l\'id', () => {
      jest.spyOn(sync, 'enqueue');

      const item = {
        id: 'uuid-update-enqueue',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      jest.clearAllMocks();

      store.update({ ...item, titre: 'Updated' });

      expect(sync.enqueue).toHaveBeenCalledWith('uuid-update-enqueue', 'upsert');
    });

    it('appelle sync.flushPending()', () => {
      jest.spyOn(sync, 'flushPending').mockResolvedValue();

      const item = {
        id: 'uuid-update-flush',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      jest.clearAllMocks();

      store.update({ ...item, titre: 'Updated' });

      expect(sync.flushPending).toHaveBeenCalled();
    });

    it('specs § F3.3 : modification offline → item local + file', () => {
      global.navigator.onLine = false;
      jest.spyOn(sync, 'enqueue');

      const item = {
        id: 'uuid-offline-update',
        type: 'projet',
        titre: 'Original',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      jest.clearAllMocks();

      const updated = { ...item, titre: 'Modified' };
      store.update(updated);

      // Item modifié localement
      expect(store.getAll()[0].titre).toBe('Modified');

      // Enqueueé pour sync
      expect(sync.enqueue).toHaveBeenCalledWith('uuid-offline-update', 'upsert');
    });

    it('ne throw pas si l\'item n\'existe pas (upsert-like)', () => {
      const nonexistent = {
        id: 'uuid-new',
        type: 'projet',
        titre: 'New',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      expect(() => store.update(nonexistent)).not.toThrow();

      // Peut être ajouté ou ignoré selon l'implémentation
      // Accepter les deux comportements (soft insertion ou skip)
    });

    it('conserve les autres items lors d\'une modification', () => {
      const item1 = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Item 1',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      const item2 = {
        id: 'uuid-2',
        type: 'feature',
        titre: 'Item 2',
        priorite: 'moyenne',
        createdAt: new Date().toISOString()
      };

      store.add(item1);
      store.add(item2);

      store.update({ ...item1, titre: 'Updated' });

      const all = store.getAll();
      expect(all).toHaveLength(2);
      expect(all.find(i => i.id === 'uuid-1').titre).toBe('Updated');
      expect(all.find(i => i.id === 'uuid-2').titre).toBe('Item 2');
    });
  });

  describe('fetchFromGitHub()', () => {
    it('fetch depuis /api/backlog en GET', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      await store.fetchFromGitHub();

      expect(global.fetch).toHaveBeenCalledWith('/api/backlog');
    });

    it('met à jour le cache local en cas de succès', async () => {
      const remoteItems = [
        {
          id: 'remote-1',
          type: 'projet',
          titre: 'Remote',
          priorite: 'haute',
          createdAt: '2026-06-29T10:00:00Z'
        }
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: remoteItems })
      });

      await store.fetchFromGitHub();

      expect(store.getAll()).toEqual(remoteItems);
    });

    it('throw si fetch échoue (réseau)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network'));

      await expect(store.fetchFromGitHub()).rejects.toThrow('Network');
    });

    it('throw si réponse non-ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      await expect(store.fetchFromGitHub()).rejects.toThrow();
    });
  });

  describe('pushToGitHub(items)', () => {
    it('envoie PUT /api/backlog avec les items', async () => {
      const items = [
        {
          id: 'uuid-1',
          type: 'projet',
          titre: 'Test',
          priorite: 'haute',
          createdAt: '2026-06-29T10:00:00Z'
        }
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      await store.pushToGitHub(items);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/backlog',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('uuid-1')
        })
      );
    });

    it('throw si PUT échoue', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network'));

      await expect(store.pushToGitHub([])).rejects.toThrow('Network');
    });

    it('throw si réponse non-ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Items empty' })
      });

      await expect(store.pushToGitHub([])).rejects.toThrow();
    });
  });

  describe('Intégration : offline workflow', () => {
    it('specs § F3.2 + F4 : création offline → cache local → file → sync au retour réseau', async () => {
      global.navigator.onLine = false;

      // 1. Créer offline
      const item = {
        id: 'uuid-integration',
        type: 'projet',
        titre: 'Créé offline',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);

      // 2. Item dans le cache
      expect(store.getAll()).toContainEqual(item);

      // 3. Item en file
      expect(sync.hasPending()).toBe(true);

      // 4. Simuler retour réseau
      global.navigator.onLine = true;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      // 5. Flush
      await sync.flushPending();

      // 6. File vidée
      expect(sync.hasPending()).toBe(false);

      // 7. PUT envoyé
      expect(global.fetch).toHaveBeenCalled();
    });

    it('specs § F4 : modification offline → local → file → sync au retour réseau', async () => {
      global.navigator.onLine = true;

      // Créer un item en ligne
      const item = {
        id: 'uuid-mod-integration',
        type: 'projet',
        titre: 'Original',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      await sync.flushPending();
      global.fetch.mockClear();

      // Passer offline
      global.navigator.onLine = false;

      // Modifier l'item
      store.update({ ...item, titre: 'Modified offline' });

      // En file
      expect(sync.hasPending()).toBe(true);

      // Retour réseau
      global.navigator.onLine = true;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      await sync.flushPending();

      // Synchronisé
      expect(sync.hasPending()).toBe(false);
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
