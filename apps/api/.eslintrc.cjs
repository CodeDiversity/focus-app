module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // Runs Prettier as an ESLint rule (prettier/prettier) and disables
    // conflicting formatting rules via eslint-config-prettier (STUDY-21A).
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // warn in application code, error in tests (STUDY-21A implementation plan).
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      // Test files must not log to the console (STUDY-21A).
      files: ['src/test/**/*.ts'],
      rules: { 'no-console': 'error' },
    },
    {
      // The NestJS bootstrap intentionally logs the startup URL (STUDY-21A:
      // keeps `lint --max-warnings 0` clean without touching app code).
      files: ['src/main.ts'],
      rules: { 'no-console': 'off' },
    },
  ],
  // Generated Prisma client output — never lint or hand-edit (STUDY-21A).
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'src/generated'],
};
