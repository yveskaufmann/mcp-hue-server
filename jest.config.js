import { createDefaultEsmPreset } from 'ts-jest';

const defaultEsmPreset = createDefaultEsmPreset();

/** @type {import('ts-jest').JestConfigWithTsJest} **/
const config = {
  ...defaultEsmPreset,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/node_modules'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};

export default config;
