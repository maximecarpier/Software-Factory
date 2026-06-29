import 'jest-localstorage-mock';

// En mode native ESM (--experimental-vm-modules), `jest` n'est pas injecté automatiquement
// comme global dans les modules de test. On le propage manuellement ici (il est disponible
// dans le contexte setupFilesAfterEnv).
global.jest = jest;

// Mock navigator.onLine
// En Node.js, global.navigator peut être absent (<21) ou partiel — on le crée si besoin.
if (!global.navigator) {
  global.navigator = {};
}
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock crypto.randomUUID pour les tests
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  let uuidCounter = 0;
  global.crypto.randomUUID = () => `test-uuid-${uuidCounter++}`;
}

// Mock de fetch global (sera surchargé dans les tests)
if (!global.fetch) {
  global.fetch = jest.fn();
}
