module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    // Lighter a11y set per decision D21-6; explicit rules below pin the
    // required minimum (STUDY-21A, AC-21A-4).
    'plugin:jsx-a11y/recommended',
    // Runs Prettier as an ESLint rule (prettier/prettier) and disables
    // conflicting formatting rules via eslint-config-prettier (STUDY-21A).
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'import'],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      alias: { map: [['@', './src']], extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
  },
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    // Explicit accessibility minimum per decision D21-6 (STUDY-21A, AC-21A-4).
    // Deviation from the settled D21-6 rule list: `focus-tabindex` and
    // `jsx-no-target-blank` do not exist in any eslint-plugin-jsx-a11y 6.x
    // build in this registry (verified against packed tarballs 6.2.0–6.9.0 and
    // the installed 6.10.2). `tabindex-no-positive` is the closest surviving
    // equivalent of `focus-tabindex` (flags positive tabindex on elements);
    // the target-blank intent has no equivalent in this plugin version and is
    // dropped (modern browsers default `rel="noopener"` for `target="_blank"`).
    // See the STUDY-21A checkpoint findings.
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // FSD layer-direction enforcement (RD6) — import/no-restricted-paths zones.
    // In each zone: target = importing folder (files in target cannot import from from),
    //               from  = imported folder (files in from cannot be imported by target).
    // basePath is set to the ESLint config directory (apps/web) so paths resolve correctly.
    'import/no-restricted-paths': ['error', {
      basePath: './',
      zones: [
        // shared/ cannot import from anything above it (except: type-only import of AuthResponse from features/auth/model/types — RD13).
        {
          target: 'src/shared',
          from: ['src/entities', 'src/features', 'src/widgets', 'src/pages', 'src/app'],
          except: ['auth/model/types.ts'],
          message: 'shared/ files cannot import from entities/, features/, widgets/, pages/, or app/ (except: type-only import of AuthResponse from features/auth/model/types — RD13)',
        },
        // entities/ cannot import from features/, widgets/, pages/, or app/
        {
          target: 'src/entities',
          from: ['src/features', 'src/widgets', 'src/pages', 'src/app'],
          message: 'entities/ files cannot import from features/, widgets/, pages/, or app/',
        },
        // features/ cannot import from widgets/, pages/, or app/ (sanctioned: features/session and auth/model may import app/store per RD7)
        {
          target: 'src/features',
          from: ['src/widgets', 'src/pages', 'src/app'],
          message: 'features/ files cannot import from widgets/, pages/, or app/ (use eslint-disable for sanctioned store/hooks exceptions)',
        },
        // widgets/ cannot import from pages/ or app/ (sanctioned exceptions use eslint-disable)
        {
          target: 'src/widgets',
          from: ['src/pages', 'src/app'],
          message: 'widgets/ files cannot import from pages/ or app/ (use eslint-disable for sanctioned store/hooks exceptions)',
        },
        // pages/ cannot import from app/ (sanctioned: may import app/store per RD7)
        {
          target: 'src/pages',
          from: 'src/app',
          message: 'pages/ files cannot import from app/ (use eslint-disable for sanctioned store/hooks exceptions)',
        },
      ],
    }],
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
  ],
};
