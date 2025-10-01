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
  files: ['**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs',
    globals: globals
      ? {
          ...globals.node,
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
    ignores: ['node_modules/**', 'uploads/**'],
  },
  baseConfig,
];
