import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  {
    ignores: ['coverage/**', 'playwright-report/**', 'test-results/**', '.next/**'],
  },
  ...nextVitals,
  ...nextTs,
];

export default config;
