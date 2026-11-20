import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'pt'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    ignore: [
      'src/**/*.spec.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/**/tests/**',
      'src/**/__tests__/**',
      'src/**/__mocks__/**',
      'src/mocks/**'
    ],
    output: 'public/locales/{{language}}/{{namespace}}.json',
    primaryLanguage: 'en',
    defaultNS: 'translation',
    nsSeparator: ':',
    keySeparator: '.',
    removeUnusedKeys: false,
    omitMissingKeys: true,
    extractFromComments: false,
    sort: false,
    indentation: 2
  }
});
