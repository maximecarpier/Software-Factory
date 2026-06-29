import 'jest-localstorage-mock';

// Mock navigator.onLine
// En Node.js ≥21, navigator est disponible globalement mais peut manquer onLine.
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
