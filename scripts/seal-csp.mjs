#!/usr/bin/env node
/**
 * Fills in the Content-Security-Policy each built page ships with.
 *
 * The point is not generic hardening. The privacy policy published here tells
 * visitors that nothing about them is sent anywhere, and until now that was a
 * sentence they had to take on trust. `connect-src 'none'` makes the browser
 * enforce it: if anything on this site ever tried to open a request - an
 * analytics snippet added in a hurry, a font pulled from a CDN, a paste from a
 * tutorial - the browser refuses it rather than the claim quietly becoming
 * false. The claim and the markup have to agree, and this is the strongest
 * available way of saying so.
 *
 * Every inline script and style is allowed by hash rather than by
 * `'unsafe-inline'`, which would have let any injected script run and made
 * script-src worth roughly nothing. The hashes cannot be written by hand or by
 * Astro: they are of the exact bytes in the final file, after the build has
 * minified them, so this runs on `dist/` and rewrites the placeholder in place.
 *
 * One directive is missing and cannot be here. `frame-ancestors`, which stops
 * the page being framed by somebody else, is ignored when a policy arrives in a
 * <meta> element - it needs a real HTTP header, and GitHub Pages does not let
 * anyone set one. Nothing to be done about that short of moving hosts.
 *
 *   node scripts/seal-csp.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const DIST = 'dist';
const PLACEHOLDER = 'SCRIPT_HASHES';
const STYLE_PLACEHOLDER = 'STYLE_HASHES';

if (!existsSync(DIST)) {
  console.error('  no dist/ - run the build first');
  process.exit(1);
}

const sha256 = (body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (entry.endsWith('.html')) pages.push(path);
  }
})(DIST);

let sealed = 0;
let scripts = 0;
let styles = 0;

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes(PLACEHOLDER)) continue;

  // Inline only. Anything with a src is covered by 'self'.
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
  const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);

  const filled = html
    .replace(PLACEHOLDER, inlineScripts.map(sha256).join(' ') || `'none'`)
    .replace(STYLE_PLACEHOLDER, inlineStyles.map(sha256).join(' '));

  writeFileSync(file, filled);
  sealed += 1;
  scripts += inlineScripts.length;
  styles += inlineStyles.length;
}

console.log(
  `  sealed ${sealed} page(s): ${scripts} inline script(s) and ${styles} style(s) allowed by hash`,
);
