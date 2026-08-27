#!/usr/bin/env node
/**
 * Checks that the translations still describe the same app the English one does.
 *
 * The schema in src/content.config.ts already refuses a translation that is
 * missing a field. This asks the two questions a schema cannot:
 *
 *   1. Has English moved since this translation was written?
 *      Every translation records `sourceHash`, a fingerprint of the English
 *      file it was made from. When English changes, that stops matching and the
 *      translation is named here as stale. This is the failure that actually
 *      happens: someone fixes a sentence in English, ten files quietly keep the
 *      old claim, and a year later the German policy describes an app that no
 *      longer exists.
 *
 *   2. Does it still have the same shape?
 *      Same number of sections, same number of bullets in each. A translation
 *      with twelve sections where English has thirteen has dropped one, and
 *      dropping a section from a privacy policy is not a typo.
 *
 * Shape drift is an error: it means the file is definitely wrong.
 * Staleness is a warning here and an error under --strict, so a one-word fix to
 * the English page is not blocked by nine pending translations - but nobody
 * gets to pretend the other nine are current either.
 *
 *   node scripts/check-translations.mjs            warn on stale, fail on drift
 *   node scripts/check-translations.mjs --strict   fail on either
 *   node scripts/check-translations.mjs --restamp  mark translations as current
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'content', 'i18n');
const CANON = 'en';
const META = new Set(['name', 'dir', 'sourceHash']);

const strict = process.argv.includes('--strict');
const restamp = process.argv.includes('--restamp');

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** Key order in a JSON file is an editing accident, not content. Sort it away
 *  so reformatting a file never reads as a change to what it says. */
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = stable(value[k]);
        return acc;
      }, {});
  }
  return value;
}

/** The translatable content only: the meta fields describe the file, not the
 *  message, and `name` differing per language must not count as a change. */
function contentOf(doc) {
  const out = {};
  for (const k of Object.keys(doc)) if (!META.has(k)) out[k] = doc[k];
  return stable(out);
}

function fingerprint(doc) {
  return createHash('sha256').update(JSON.stringify(contentOf(doc))).digest('hex').slice(0, 16);
}

/** Structure with the words removed: every string becomes the same token, so
 *  what is left is the shape both files must share. */
function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = shape(value[k]);
        return acc;
      }, {});
  }
  return typeof value === 'string' ? '#' : value;
}

/** Where two shapes first disagree, in a path a person can act on. */
function firstDrift(a, b, path = '') {
  const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a;
  const tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
  if (ta !== tb) return `${path || '(root)'}: English has ${ta}, this file has ${tb}`;

  if (ta === 'array') {
    if (a.length !== b.length) {
      return `${path}: English has ${a.length} item(s), this file has ${b.length}`;
    }
    for (let i = 0; i < a.length; i++) {
      const d = firstDrift(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }

  if (ta === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    const missing = ka.filter((k) => !kb.includes(k));
    if (missing.length) return `${path || '(root)'}: missing ${missing.join(', ')}`;
    const extra = kb.filter((k) => !ka.includes(k));
    if (extra.length) return `${path || '(root)'}: unexpected ${extra.join(', ')}`;
    for (const k of ka) {
      const d = firstDrift(a[k], b[k], path ? `${path}.${k}` : k);
      if (d) return d;
    }
  }
  return null;
}

// --- read ------------------------------------------------------------------

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const read = (code) => JSON.parse(readFileSync(join(DIR, `${code}.json`), 'utf8'));

if (!files.includes(`${CANON}.json`)) {
  console.error(red(`  no ${CANON}.json in src/content/i18n - nothing to compare against`));
  process.exit(1);
}

const canon = read(CANON);
const canonHash = fingerprint(canon);
const canonShape = shape(contentOf(canon));
const others = files.map((f) => f.replace(/\.json$/, '')).filter((c) => c !== CANON).sort();

// --- restamp ---------------------------------------------------------------

if (restamp) {
  let stamped = 0;
  for (const code of others) {
    const doc = read(code);
    if (doc.sourceHash === canonHash) continue;
    doc.sourceHash = canonHash;
    writeFileSync(join(DIR, `${code}.json`), JSON.stringify(doc, null, 2) + '\n', 'utf8');
    stamped++;
    console.log(`  stamped ${code} -> ${canonHash}`);
  }
  console.log(stamped ? green(`  ${stamped} file(s) marked current`) : dim('  all already current'));
  console.log(dim('  Only do this after actually re-reading each one against English.'));
  process.exit(0);
}

// --- check -----------------------------------------------------------------

console.log(`  English fingerprint ${dim(canonHash)}  ${dim(`(${others.length} translations)`)}`);

const stale = [];
const drifted = [];

for (const code of others) {
  const doc = read(code);
  const drift = firstDrift(canonShape, shape(contentOf(doc)));

  if (drift) {
    drifted.push({ code, drift });
    console.log(`  ${red('DRIFT')} ${code.padEnd(8)} ${drift}`);
    continue;
  }
  if (doc.sourceHash !== canonHash) {
    stale.push(code);
    console.log(`  ${yellow('stale')} ${code.padEnd(8)} written against ${dim(doc.sourceHash)}`);
    continue;
  }
  console.log(`  ${green('ok')}    ${code.padEnd(8)} current`);
}

console.log('');

if (drifted.length) {
  console.error(red(`  ${drifted.length} translation(s) no longer match the English structure.`));
  console.error('  Fix the file, then: npm run restamp');
  process.exit(1);
}

if (stale.length) {
  const msg = `  ${stale.length} translation(s) behind English: ${stale.join(', ')}`;
  if (strict) {
    console.error(red(msg));
    console.error('  Re-read each against English, then: npm run restamp');
    process.exit(1);
  }
  console.warn(yellow(msg));
  console.warn(dim('  The site will still build. Re-read each against English, then: npm run restamp'));
  process.exit(0);
}

console.log(green(`  all ${others.length} translations current against English`));
