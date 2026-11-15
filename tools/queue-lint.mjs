#!/usr/bin/env node
// queue-lint: structural checks for a delivery home (README queue, story files, links, IDs).
// Usage: node tools/queue-lint.mjs docs/stories/EP13
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const home = process.argv[2];
if (!home || !existsSync(join(home, 'README.md'))) { console.error('usage: queue-lint <delivery-home with README.md>'); process.exit(2); }
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
  // 5. Checkpoint steps are S<n>, never M<n>.
  if (/checkpoint\.md$/.test(f) && /\n- \[[ x]\] M\d/.test(txt)) err(name, 'checkpoint steps use M<n>; use S<n> (M is milestones)');
}
if (errors.length) { console.error(errors.join('\n')); console.error(`\nqueue-lint: ${errors.length} issue(s)`); process.exit(1); }
console.log(`queue-lint: ${home} clean (${files.length} files)`);
