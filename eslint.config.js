import n from 'eslint-plugin-n';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
    {
        ignores: ['eslint.config.js', 'dist/**'],
    },
    {
        files: ['src/**/*.{ts,tsx,mts,cts}'],

        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
                sourceType: 'module',
            },
        },

        plugins: {
            '@typescript-eslint': tsPlugin,
            n,
        },

        rules: {
            ...n.configs['flat/recommended'].rules,
            'n/no-missing-import': 'off',
            'no-restricted-globals': [
                'error',
                { name: '__dirname', message: '__dirname does not exist in Node ESM.' },
                { name: '__filename', message: '__filename does not exist in Node ESM.' },
            ],
        },

        settings: {
            node: {
                version: '>=18.0.0',
            },
        },
    },
    prettier,
];
