const fs = require('fs');
const path = require('path');

let js = null;
let globals = null;

try {
  js = require('@eslint/js');
} catch {
  // @eslint/js not installed; config will still export a valid flat config
  // with basic ignore patterns.
}

try {
  globals = require('globals');
} catch {
  // globals not installed.
}

const baseConfig = {
  files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.vue'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: globals
      ? {
          ...globals.browser,
          ...globals.es2021,
        }
      : {},
  },
  rules: js
    ? {
        ...js.configs.recommended.rules,
        'no-unused-vars': 'warn',
        'no-console': 'off',
      }
    : {},
};

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**'],
  },
  baseConfig,
];
