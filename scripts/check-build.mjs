#!/usr/bin/env node
/**
 * Reads the built site and asks whether it says what it should.
 *
 * The schema checks the words and check-translations.mjs checks they are
 * current. Nothing checked the output, and that is where a whole class of fault
 * lives: things that are correct in the source and wrong on the page.
 *
 * The one that prompted this: the 404 is built through the same layout as every
 * other page and passes `page="home"`, because that is how it gets a header. It
 * inherited the home page's identity with it - `rel=canonical` to `/`, sixteen
 * hreflang links to the sixteen home pages - and told every crawler the error
 * page was the front door. The source read correctly. Only the output was wrong,
 * and it was found by chance.
 *
 * Every rule below is one that has already been broken here, or is one edit
 * away from it.
 *
 *   node scripts/check-build.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { LOCALES, DEFAULT_LOCALE, SITE_URL, OG_LOCALES } from '../site.config.mjs';

/** Every app has a page of its own, and the slug is the same in all sixteen. */
const APP_SLUGS = JSON.parse(readFileSync('src/content/i18n/en.json', 'utf8')).apps.list.map(
  (a) => a.slug,
);

const DIST = 'dist';
const ERROR_PAGE = '404.html';

/** hreflang links per page: one per language, plus x-default. */
const EXPECTED_ALTERNATES = LOCALES.length + 1;

const problems = [];
const fail = (file, rule, detail = '') => problems.push({ file, rule, detail });

if (!existsSync(DIST)) {
  console.error('  no dist/ - run the build first');
  process.exit(1);
}

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (entry.endsWith('.html')) pages.push(path);
  }
})(DIST);

const attr = (html, re) => html.match(re)?.[1] ?? null;

/** The address this file answers to, as the site would write it. */
function ownUrl(rel) {
  return SITE_URL + '/' + rel.replace(/index\.html$/, '');
}

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(DIST, file).replace(/\\/g, '/');
  const isError = rel === ERROR_PAGE;

  // --- what the page says it is -----------------------------------------
  if (!attr(html, /<title>([^<]*)<\/title>/)) fail(rel, 'no <title>');
  if (!attr(html, /<meta name="description" content="([^"]+)"/)) fail(rel, 'no description');

  const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
  const alternates = [...html.matchAll(/rel="alternate" hreflang="([^"]*)"/g)].map((m) => m[1]);

  if (isError) {
    // An error page is not a page of this site and must not claim to be one.
    if (canonical) fail(rel, 'error page has a canonical', canonical);
    if (alternates.length) fail(rel, 'error page has hreflang', `${alternates.length} of them`);
    if (!/name="robots"[^>]*noindex/.test(html)) fail(rel, 'error page is indexable');
  } else {
    if (!canonical) fail(rel, 'no canonical');
    else if (canonical !== ownUrl(rel)) fail(rel, 'canonical points elsewhere', `${canonical} != ${ownUrl(rel)}`);

    if (alternates.length !== EXPECTED_ALTERNATES)
      fail(rel, 'wrong number of hreflang', `${alternates.length}, expected ${EXPECTED_ALTERNATES}`);
    if (!alternates.includes('x-default')) fail(rel, 'no x-default');

    const missing = LOCALES.filter((code) => !alternates.includes(code));
    if (missing.length) fail(rel, 'languages missing from hreflang', missing.join(', '));
  }

  // --- language ----------------------------------------------------------
  const lang = attr(html, /<html lang="([^"]*)"/);
  const segment = rel.split('/')[0];
  const expected = LOCALES.includes(segment) ? segment : DEFAULT_LOCALE;
  if (lang !== expected) fail(rel, 'lang does not match the path', `${lang} in /${segment}/`);

  // --- the social card ---------------------------------------------------
  const ogLocale = attr(html, /property="og:locale" content="([^"]*)"/);
  if (!isError && ogLocale !== OG_LOCALES[expected])
    fail(rel, 'og:locale is not this page\'s', `${ogLocale}, expected ${OG_LOCALES[expected]}`);

  const ogImage = attr(html, /property="og:image" content="([^"]*)"/);
  if (!ogImage) fail(rel, 'no og:image');
  else {
    const path = join(DIST, ogImage.replace(SITE_URL, ''));
    if (!existsSync(path)) fail(rel, 'og:image is not in the build', ogImage);
  }

  // --- structured data ---------------------------------------------------
  const ld = html.match(/application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
  if (ld) {
    if (ld[1].includes('</')) fail(rel, 'JSON-LD contains a raw </, which ends the script early');
    try {
      JSON.parse(ld[1].replace(/\\u003c/g, '<'));
    } catch (e) {
      fail(rel, 'JSON-LD does not parse', e.message);
    }
  }

  /*
    An app's own page is the one a search result points at, so it is the one
    that has to describe itself. It carried nothing: the condition emitting the
    graph asked for the catalogue exactly, and `apps/allvrpuzzles` is not
    `apps`.
  */
  if (/^([a-zA-Z-]+\/)?apps\/[^/]+\/index\.html$/.test(rel) && !ld) {
    fail(rel, 'an app page with no structured data');
  }

  // --- the policy the page ships with ------------------------------------
  const csp = attr(html, /http-equiv="Content-Security-Policy" content="([^"]*)"/);
  if (!csp) fail(rel, 'no Content-Security-Policy');
  else if (csp.includes('SCRIPT_HASHES')) fail(rel, 'CSP placeholder was never sealed');

  // --- every link and asset resolves -------------------------------------
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const target = extname(href)
      ? join(DIST, href)
      : join(DIST, href, href.endsWith('/') ? 'index.html' : '');
    if (!existsSync(target)) fail(rel, extname(href) ? 'dead asset' : 'dead link', href);
  }
  for (const [, src] of html.matchAll(/src="(\/[^"#?]*)"/g)) {
    if (!existsSync(join(DIST, src))) fail(rel, 'dead asset', src);
  }
}

// --- the whole build ------------------------------------------------------
for (const code of LOCALES) {
  for (const leaf of ['', 'apps/', 'privacy/', ...APP_SLUGS.map((s) => `apps/${s}/`)]) {
    const dir = code === DEFAULT_LOCALE ? leaf : `${code}/${leaf}`;
    if (!existsSync(join(DIST, dir, 'index.html'))) fail(dir || '/', 'route missing for this language');
  }
  if (!existsSync(join(DIST, 'og', `${code}.png`))) fail(`og/${code}.png`, 'no social card for this language');
}

// --- the sitemap agrees with what was built -------------------------------
/*
 * Nothing was checking this, and it is exactly the kind of gap that stays quiet:
 * a page can build, link correctly and be reachable while simply not being in
 * the file that tells search engines it exists. Adding the app pages was the
 * moment to notice - sixteen new addresses that nobody would have missed.
 */
const sitemapFile = join(DIST, 'sitemap-0.xml');
if (!existsSync(sitemapFile)) {
  fail('sitemap-0.xml', 'no sitemap was written');
} else {
  const listed = new Set(
    [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]),
  );

  for (const file of pages) {
    const rel = relative(DIST, file).replace(/\\/g, '/');
    if (rel === ERROR_PAGE) {
      // An error page is not a place, and inviting a crawler to it is worse
      // than useless: it is the one address that must not be in here.
      if (listed.has(ownUrl(rel))) fail(rel, 'the error page is in the sitemap');
      continue;
    }
    if (!listed.has(ownUrl(rel))) fail(rel, 'built but missing from the sitemap');
  }

  for (const url of listed) {
    const path = join(DIST, url.replace(SITE_URL, ''), 'index.html');
    if (!existsSync(path)) fail('sitemap-0.xml', 'lists a page that was not built', url);
  }
}

// --- report ---------------------------------------------------------------
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

console.log(`  ${pages.length} pages, ${LOCALES.length} languages`);

if (!problems.length) {
  console.log(`${GREEN}  the built site checks out${OFF}`);
  process.exit(0);
}

const byRule = new Map();
for (const p of problems) byRule.set(p.rule, [...(byRule.get(p.rule) ?? []), p]);

console.log('');
for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${RED}  ${rule}${OFF} ${DIM}(${list.length})${OFF}`);
  for (const p of list.slice(0, 5)) console.log(`      ${p.file}${p.detail ? `  ${DIM}${p.detail}${OFF}` : ''}`);
  if (list.length > 5) console.log(`${DIM}      ... and ${list.length - 5} more${OFF}`);
}
console.log('');
process.exit(1);
