module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@psp/core$': '<rootDir>/packages/core/src',
    '^@psp/server$': '<rootDir>/packages/server/src'
  },
  collectCoverageFrom: [
    'packages/**/src/**/*.{js,ts}',
    '!packages/**/src/**/*.d.ts',
    '!packages/**/src/**/*.test.{js,ts}',
    '!packages/**/src/**/*.spec.{js,ts}'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};