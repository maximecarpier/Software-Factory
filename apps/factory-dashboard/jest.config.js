export default {
  testEnvironment: 'node',
  // babel-jest transforme import/export → CJS, rendant les exports mutables pour jest.spyOn.
  // Cela évite le "Cannot assign to read only property" des namespaces ESM natifs.
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js'
  ]
};
