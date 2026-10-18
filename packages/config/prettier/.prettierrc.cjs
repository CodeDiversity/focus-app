/**
 * StudyPilot shared Prettier configuration (STUDY-21A, decision D21-1).
 *
 * Single source of truth for formatting across the monorepo. Apps reference it
 * explicitly in their `format` / `format:write` scripts via
 * `--config ../../packages/config/prettier/.prettierrc.cjs`; the root
 * `.prettierrc.cjs` requires this file so editor integrations and root-level
 * runs resolve the same settings.
 */
module.exports = {
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
};
