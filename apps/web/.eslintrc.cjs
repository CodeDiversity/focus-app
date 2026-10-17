module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'import'],
  settings: { react: { version: 'detect' }, 'import/resolver': { typescript: { project: './tsconfig.json' } } },
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // FSD layer-direction enforcement (RD6) — eslint-plugin-import fallback
    'import/no-restricted-paths': ['error', {
      zones: [
        // shared/ cannot import from anything above it
        {
          target: ['./src/entities', './src/features', './src/widgets', './src/pages', './src/app'],
          from: './src/shared',
          message: 'shared/ files cannot import from entities/, features/, widgets/, pages/, or app/',
        },
        // entities/ cannot import from features/, widgets/, pages/, or app/
        {
          target: ['./src/features', './src/widgets', './src/pages', './src/app'],
          from: './src/entities',
          message: 'entities/ files cannot import from features/, widgets/, pages/, or app/',
        },
        // features/ cannot import from widgets/, pages/, or app/ (sanctioned exceptions use eslint-disable)
        {
          target: ['./src/widgets', './src/pages', './src/app'],
          from: './src/features',
          message: 'features/ files cannot import from widgets/, pages/, or app/ (use eslint-disable for sanctioned store/hooks exceptions)',
        },
        // widgets/ cannot import from pages/ or app/ (sanctioned exceptions use eslint-disable)
        {
          target: ['./src/pages', './src/app'],
          from: './src/widgets',
          message: 'widgets/ files cannot import from pages/ or app/ (use eslint-disable for sanctioned store/hooks exceptions)',
        },
        // pages/ cannot import from app/ (sanctioned exceptions use eslint-disable)
        {
          target: './src/app',
          from: './src/pages',
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
