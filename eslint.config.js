import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['node_modules/**', '*.min.js', 'sw.js', 'index.html'] },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser },
    },
    {
        files: ['src/sw.js'],
        languageOptions: { globals: { ...globals.serviceworker, __ASSETS__: 'readonly' } },
    },
    {
        files: ['scripts/**/*.mjs', 'test/**/*.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
    },
];
