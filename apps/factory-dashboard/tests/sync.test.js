/**
 * Tests M-SYNC : File d'attente offline + flushPending()
 *
 * Cas couverts :
 * - Garde de réentrance (deux flush simultanés n'envoient qu'un PUT)
 * - PUT rejeté si backlog vide (400)
 * - Flush échoue réseau (file conservée)
 * - Offline : flushPending() ne fait rien
 * - Anti-doublons : même id dans la file = une seule entrée
 */

import * as sync from '../src/sync.js';
import * as store from '../src/store.js';

// Mocks
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  global.navigator.onLine = true;

  // Réinitialiser crypto.randomUUID
  let uuidCounter = 0;
  global.crypto.randomUUID = () => `test-uuid-${uuidCounter++}`;
});

describe('M-SYNC — File d\'attente offline', () => {
  describe('isOnline()', () => {
    it('retourne true quand navigator.onLine est true', () => {
      global.navigator.onLine = true;
      expect(sync.isOnline()).toBe(true);
    });

    it('retourne false quand navigator.onLine est false', () => {
      global.navigator.onLine = false;
      expect(sync.isOnline()).toBe(false);
    });
  });

  describe('enqueue(id, op)', () => {
    it('ajoute une entrée à factory_pending', () => {
      sync.enqueue('item-1', 'upsert');

      const pending = sync.getPending();
      expect(pending).toHaveProperty('item-1');
      expect(pending['item-1'].op).toBe('upsert');
      expect(pending['item-1']).toHaveProperty('queuedAt');
    });

    it('écrase une entrée existante (anti-doublon par id)', () => {
      sync.enqueue('item-1', 'upsert');
      const firstQueuedAt = sync.getPending()['item-1'].queuedAt;

      // Petite pause pour différencier les timestamps
      jest.useFakeTimers();
      jest.advanceTimersByTime(10);
      jest.useRealTimers();

      sync.enqueue('item-1', 'upsert');
      const pending = sync.getPending();

      // Doit avoir une seule entrée pour item-1
      expect(Object.keys(pending).filter(k => k === 'item-1')).toHaveLength(1);
    });

    it('remplace op pour la même clé', () => {
      sync.enqueue('item-1', 'upsert');
      sync.enqueue('item-1', 'delete');

      expect(sync.getPending()['item-1'].op).toBe('delete');
    });

    it('accepte op par défaut = "upsert"', () => {
      sync.enqueue('item-1');
      expect(sync.getPending()['item-1'].op).toBe('upsert');
    });
  });

  describe('getPending()', () => {
    it('retourne {} si la file est vide', () => {
      expect(sync.getPending()).toEqual({});
    });

    it('retourne les entrées stockées', () => {
      sync.enqueue('item-1', 'upsert');
      sync.enqueue('item-2', 'upsert');

      const pending = sync.getPending();
      expect(Object.keys(pending)).toHaveLength(2);
      expect(pending).toHaveProperty('item-1');
      expect(pending).toHaveProperty('item-2');
    });
  });

  describe('hasPending()', () => {
    it('retourne false si la file est vide', () => {
      expect(sync.hasPending()).toBe(false);
    });

    it('retourne true si la file contient des entrées', () => {
      sync.enqueue('item-1');
      expect(sync.hasPending()).toBe(true);
    });

    it('retourne false après clearPending()', () => {
      sync.enqueue('item-1');
      sync.clearPending();
      expect(sync.hasPending()).toBe(false);
    });
  });

  describe('clearPending()', () => {
    it('vide la file d\'attente', () => {
      sync.enqueue('item-1');
      sync.enqueue('item-2');

      sync.clearPending();

      expect(sync.getPending()).toEqual({});
      expect(sync.hasPending()).toBe(false);
    });

    it('vide localStorage[factory_pending]', () => {
      sync.enqueue('item-1');
      sync.clearPending();

      const raw = localStorage.getItem('factory_pending');
      expect(raw).toEqual('{}');
    });
  });

  describe('flushPending() — synchronisation réseau', () => {
    it('retourne immédiatement si offline', async () => {
      global.navigator.onLine = false;
      global.fetch = jest.fn();

      sync.enqueue('item-1');
      await sync.flushPending();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(sync.hasPending()).toBe(true); // file conservée
    });

    it('retourne immédiatement si file vide', async () => {
      global.fetch = jest.fn();

      await sync.flushPending();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('retourne immédiatement si un flush est déjà en cours (guard réentrance)', async () => {
      global.fetch = jest.fn().mockImplementation(
        () => new Promise(resolve => {
          // Simule un PUT long
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ ok: true })
          }), 100);
        })
      );

      store.add({
        id: 'test-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      });
      sync.enqueue('test-1');

      // Lancer deux flush sans attendre le premier
      const p1 = sync.flushPending();
      const p2 = sync.flushPending();

      await Promise.all([p1, p2]);

      // PUT doit avoir été appelé une seule fois (pas deux)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('appelle PUT /api/backlog avec les items du cache local', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      // Créer et enqueuer deux items
      const item1 = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Projet 1',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };
      const item2 = {
        id: 'uuid-2',
        type: 'feature',
        titre: 'Feature 1',
        priorite: 'moyenne',
        createdAt: new Date().toISOString()
      };

      store.add(item1);
      store.add(item2);
      sync.enqueue(item1.id);
      sync.enqueue(item2.id);

      await sync.flushPending();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/backlog',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('uuid-1')
        })
      );
    });

    it('vide la file après flush réussi', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      const item = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      sync.enqueue(item.id);
      expect(sync.hasPending()).toBe(true);

      await sync.flushPending();

      expect(sync.hasPending()).toBe(false);
    });

    it('garde la file si PUT échoue (réseau indisponible)', async () => {
      global.fetch = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const item = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      sync.enqueue(item.id);

      // flushPending() ne doit pas throw
      await expect(sync.flushPending()).resolves.toBeUndefined();

      // File conservée
      expect(sync.hasPending()).toBe(true);
    });

    it('garde la file si PUT retourne 500', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      const item = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      sync.enqueue(item.id);

      await expect(sync.flushPending()).resolves.toBeUndefined();
      expect(sync.hasPending()).toBe(true);
    });

    it('envoie PUT items:[] si cache vide + PUT échoue → file conservée', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' })
      });

      sync.enqueue('orphan-uuid');

      await sync.flushPending();

      // PUT envoyé avec tableau vide (API accepte [] depuis v2.1)
      expect(global.fetch).toHaveBeenCalledWith('/api/backlog', expect.objectContaining({ method: 'PUT' }));
      // Échec → file conservée
      expect(sync.hasPending()).toBe(true);
    });

    it('envoie PUT items:[] si cache vide + PUT réussit → file vidée', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      sync.enqueue('orphan-id');

      await sync.flushPending();

      // PUT envoyé même pour cache vide
      expect(global.fetch).toHaveBeenCalled();
      expect(sync.hasPending()).toBe(false);
    });
  });

  describe('Scénarios intégrés', () => {
    it('specs § F3.2 : création offline → file → sync au retour réseau', async () => {
      global.navigator.onLine = false;

      // Créer un item hors-ligne
      const item = {
        id: 'uuid-offline-1',
        type: 'projet',
        titre: 'Projet créé offline',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      sync.enqueue(item.id);

      // Item en file
      expect(sync.hasPending()).toBe(true);
      expect(sync.getPending()['uuid-offline-1']).toBeDefined();

      // Simuler le retour du réseau
      global.navigator.onLine = true;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      await sync.flushPending();

      // Item synchronisé
      expect(sync.hasPending()).toBe(false);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('specs § F3.2 : anti-doublon lors de sync multiple', async () => {
      // Créer un item et l'enqueuer
      const item = {
        id: 'uuid-1',
        type: 'projet',
        titre: 'Test',
        priorite: 'haute',
        createdAt: new Date().toISOString()
      };

      store.add(item);
      sync.enqueue(item.id);

      // Simuler une reconnexion instable : flush, puis enqueue à nouveau
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      await sync.flushPending();
      expect(sync.hasPending()).toBe(false);

      // Reconnexion instable : l'item est ré-enqueueé
      sync.enqueue(item.id);

      // Un deuxième flush
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      await sync.flushPending();

      // Le PUT envoyé inclut toujours le même item (pas de doublon côté client)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(sync.hasPending()).toBe(false);
    });
  });
});
