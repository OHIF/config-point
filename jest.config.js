module.exports = {
  verbose: true,
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest'
  },
  testMatch: ['**/tests/**/*.js'],
  testPathIgnorePatterns: [],
  testEnvironment: 'jsdom',
  testURL: 'https://hospital.com/?theme=altTheme',
  moduleFileExtensions: ['js', 'mjs'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
    '\\.(css|less)$': 'identity-obj-proxy',
  },
  // Setup
  // setupFiles: ["jest-canvas-mock/lib/index.js"],
  // Coverage
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,mjs}',
    // Not
    '!<rootDir>/src/**/*.test.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!<rootDir>/dist/**',
  ],
};
