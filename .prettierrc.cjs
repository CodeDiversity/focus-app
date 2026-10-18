/**
 * Root Prettier config pointer (STUDY-21A).
 *
 * The single source of truth is the shared workspace package
 * `packages/config/prettier` (`@studypilot/prettier-config`). This file exists
 * so editor integrations and root-level Prettier runs (which resolve config by
 * walking up from the file) pick up the shared settings. App `format` /
 * `format:write` scripts reference the shared file explicitly via `--config`.
 */
module.exports = require('./packages/config/prettier/.prettierrc.cjs');
