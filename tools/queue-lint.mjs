#!/usr/bin/env node
// queue-lint: structural checks for a delivery home (README queue, story files, links, IDs).
// Usage: node tools/queue-lint.mjs docs/stories/EP13
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

// Backlog register (EP14, user request 2026-11-16): a README section "## Backlog" holds one row per
// deferred item: | BL-<nn>-<nn> | Item | Source | Why deferred | Revisit when | Owner | Last reviewed | Status |
const BACKLOG_ROW = /^\| (BL-\d{2}-\d{2}) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|/;
const backlogRows = (text) => {
  const sec = text.split(/\n## /).find((s) => s.startsWith('Backlog'));
  return sec ? sec.split('\n').map((l) => l.match(BACKLOG_ROW)).filter(Boolean) : [];
};

// `--backlog <stories-root>`: list every open backlog row across delivery homes, least recently reviewed first.
if (process.argv[2] === '--backlog') {
  const root = process.argv[3] || 'docs/stories';
  const open = [];
  for (const d of readdirSync(root)) {
    const r = join(root, d, 'README.md');
    if (!existsSync(r)) continue;
    for (const m of backlogRows(readFileSync(r, 'utf8'))) {
      if (m[8].trim().startsWith('Backlog')) open.push({ home: d, id: m[1], item: m[2].trim(), revisit: m[5].trim(), owner: m[6].trim(), reviewed: m[7].trim() });
    }
  }
  open.sort((a, b) => (a.reviewed < b.reviewed ? -1 : a.reviewed > b.reviewed ? 1 : a.id < b.id ? -1 : 1));
  for (const o of open) console.log(`${o.reviewed}  ${o.id}  [${o.home}] ${o.item.replace(/\*\*/g, '').slice(0, 70)}\n            revisit when: ${o.revisit.slice(0, 110)}  (owner: ${o.owner})`);
  console.log(`\nbacklog: ${open.length} open item(s) across ${root}`);
  process.exit(0);
}

const home = process.argv[2];
if (!home || !existsSync(join(home, 'README.md'))) { console.error('usage: queue-lint <delivery-home with README.md> | queue-lint --backlog [stories-root]'); process.exit(2); }
const STATES = ['Queued','Needs refinement','Ready','In progress','Blocked','Implemented — awaiting parent review','Implemented — awaiting review','Reviewed'];
const errors = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const mdFiles = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); if (statSync(p).isDirectory()) return n === 'artifacts' ? mdFiles(p) : []; return n.endsWith('.md') ? [p] : []; });
const files = mdFiles(home);

// 1. README queue rows and pointer fields.
const readme = readFileSync(join(home, 'README.md'), 'utf8');
const queueSection = readme.split(/\n## /).find((sec) => sec.startsWith('Execution queue')) || readme;
for (const line of queueSection.split('\n')) {
  const m = line.match(/^\| \[([A-Z0-9-]+)\]\([^)]+\) \| ([^|]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|/);
  if (!m) continue;
  const [, id, state, , , evidence] = m;
  if (!STATES.includes(state.trim())) err('README.md', `${id}: unknown state "${state.trim()}"`);
  if (evidence.length > 260) err('README.md', `${id}: evidence cell ${evidence.length} chars (> 260) — links + one-line verdict only`);
}
if ((readme.match(/\*\*Active substory:\*\*/g) || []).length !== 1) err('README.md', 'exactly one **Active substory:** field required');
if ((readme.match(/\*\*Next substory:\*\*/g) || []).length !== 1) err('README.md', 'exactly one **Next substory:** field required');
if (readme.split(/\s+/).length > 3500) err('README.md', `${readme.split(/\s+/).length} words (> 3500) — move cold sections to history.md / contracts.md`);

// 6. Backlog register rows are complete and their status is one of the three allowed forms.
for (const [, id, item, source, why, revisit, owner, reviewed, status] of backlogRows(readme)) {
  const blank = (v) => !v.trim() || /^(—|-|tbd|n\/a)$/i.test(v.trim());
  if ([item, source, why, owner].some(blank)) err('README.md', `${id}: item, source, why-deferred and owner are required`);
  if (blank(revisit)) err('README.md', `${id}: "Revisit when" needs a concrete trigger, not a blank`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewed.trim())) err('README.md', `${id}: "Last reviewed" must be YYYY-MM-DD`);
  const s = status.trim();
  if (!(s === 'Backlog' || /^Promoted → \[[A-Z0-9-]+\]\([^)]+\)/.test(s) || /^Dropped — .{5,}/.test(s))) err('README.md', `${id}: status must be "Backlog", "Promoted → [<ID>](<story>)" or "Dropped — <reason>"`);
}

for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  const name = f.slice(home.length + 1);
  const isStory = /^[A-Z]+\d+[A-Z]\d?-/.test(name) && !name.includes('/');
  // 2. Unimplemented stories carry the shared-understanding block and a Decisions table with a Ruling column.
  if (isStory) {
    const status = (txt.match(/\*\*Status:\*\*\s*([^\n]+)/) || [])[1] || '';
    if (!/Implemented|Reviewed/.test(status)) {
      if (!/## Plan at a glance/.test(txt)) err(name, 'missing "## Plan at a glance" block');
      if (!/#{2,3} (Design )?[Dd]ecisions/.test(txt)) err(name, 'missing Decisions section');
      else if (!/\| *Ruling *\|/.test(txt)) err(name, 'Decisions section lacks a "Ruling" column');
    }
  }
  // 3. Bare AC citations outside story files (a story may cite its own ACs bare).
  if (!isStory && !/history\.md$|review/.test(name)) {
    for (const m of txt.matchAll(/(^|[^A-Z0-9-])(AC-?\s?\d+)\b/g)) {
      const before = txt.slice(0, m.index + m[1].length);
      if (!/[A-Z]+\d+[A-Z]\d?-$/.test(before.slice(-12)) && !/AC\d+[–-]$/.test(before.slice(-8))) err(name, `bare AC citation "${m[2]}" — qualify as <STORY>-AC<n>`);
    }
  }
  // 4. Relative links resolve.
  for (const m of txt.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    const t = m[1]; if (/^(https?:|mailto:)/.test(t)) continue;
    if (!existsSync(resolve(dirname(f), t))) err(name, `broken link ${t}`);
  }
}

// 5. Checkpoint steps are S<n>, never M<n>. Checkpoints live in artifacts/<child>/, which the walker
// above does not enter (BL-14-06 / R-EP13Q-05: this rule was dead until EP14's breakdown).
// The rule guards new writing: checkpoints of children already Implemented/Reviewed are history
// (id-conventions: legacy checkpoints used M<n> and are read by context) and are not re-linted.
const childState = new Map();
for (const line of queueSection.split('\n')) {
  const m = line.match(/^\| \[([A-Z0-9-]+)\]\([^)]+\) \| ([^|]+) \|/);
  if (m) childState.set(m[1], m[2].trim());
}
const artifactsDir = join(home, 'artifacts');
if (existsSync(artifactsDir)) {
  for (const child of readdirSync(artifactsDir)) {
    const cp = join(artifactsDir, child, 'checkpoint.md');
    if (!existsSync(cp) || /^(Implemented|Reviewed)/.test(childState.get(child) || '')) continue;
    if (/\n- \[[ x]\] M\d/.test(readFileSync(cp, 'utf8'))) err(`artifacts/${child}/checkpoint.md`, 'checkpoint steps use M<n>; use S<n> (M is milestones)');
  }
}
if (errors.length) { console.error(errors.join('\n')); console.error(`\nqueue-lint: ${errors.length} issue(s)`); process.exit(1); }
console.log(`queue-lint: ${home} clean (${files.length} files)`);
