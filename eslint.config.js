import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    // Existing preview animations deliberately reset local state when sheets open.
    files: [
      'src/App.tsx',
      'src/components/ActionSetupSheet.tsx',
      'src/components/FindMoneySheet.tsx',
      'src/components/FlowLinksSheet.tsx',
      'src/components/GuardSheet.tsx',
      'src/screens/Live.tsx',
    ],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
  {
    files: ['src/App.tsx'],
    rules: { 'react-hooks/refs': 'off' },
  },
  {
    files: ['src/components/Sheet.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
