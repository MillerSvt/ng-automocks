export default {
  displayName: 'ng-automocks-jest',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.m?[tj]s$': ['jest-preset-angular', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'mjs', 'cts', 'mts'],
  coverageDirectory: '../../coverage/libs/ng-automocks-jest',
  transformIgnorePatterns: [
    '/node_modules/(?!.*\\.mjs$)',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};
