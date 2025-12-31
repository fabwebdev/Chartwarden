/**
 * Shared ESLint configurations for Chartwarden monorepo
 */

const baseConfig = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  rules: {
    'prettier/prettier': 'warn',
    'no-console': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '.next/', 'coverage/', '*.min.js']
};

const nodeConfig = {
  ...baseConfig,
  env: {
    ...baseConfig.env,
    node: true
  }
};

const nextConfig = {
  ...baseConfig,
  env: {
    ...baseConfig.env,
    browser: true
  },
  extends: [...baseConfig.extends.filter((e) => e !== 'eslint:recommended'), 'next/core-web-vitals'],
  rules: {
    ...baseConfig.rules,
    'react/jsx-filename-extension': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off'
  }
};

module.exports = {
  baseConfig,
  nodeConfig,
  nextConfig
};
