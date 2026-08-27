#!/usr/bin/env node
/**
 * Draws one social card per language into public/og/, and the favicons beside them.
 *
 * The image every chat window, forum and search result shows instead of a bare
 * link. Without one the site shares as a line of blue text, which for a studio
 * page that will be linked from a store listing is a wasted first impression.
 *
 *   node tools/make-og-card.mjs
 *
 * Run rarely - whenever the wordmark, the palette or a tagline changes - and the
 * results are committed, because a card is not worth a build-time dependency on
 * the network. Needs network; everything else about this site builds offline.
 *
 * Two things were wrong with the card this replaces.
 *
 * There was one of it, for all sixteen languages, and nothing on it could have
 * been translated: the wordmark and the address, both Latin. A link to the
 * Polish page shared as an English object. Each card now carries that
 * language's own tagline.
 *
 * And it was never in the site's typeface, though the file said it was. The
 * text was SVG `<text>` with the face embedded as a base64 `@font-face`, and
 * the renderer behind sharp ignores that completely - rendering the same SVG
 * with and without the `@font-face` produced byte-identical output. Every card
 * came out in the renderer's fallback monospace. So the text is drawn by sharp
 * itself now, which takes a font file and actually uses it, and composited onto
 * the background rather than described inside it.
 */

import { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { LOCALES } from '../site.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'og');
const FONT_DIR = join(tmpdir(), 'slocgtory-og-fonts');

// The size every platform crops from.
const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 110;

// Straight from src/styles/global.css, dark set.
const GROUND = '#0C0D10';
const INK = '#E9EAEE';
const MUTE = '#858C99';
const ACCENT = '#2340C8';

/**
 * The tagline's face, per language.
 *
 * Bricolage Grotesque is what the site's headings are set in, and a card in
 * some other face would announce that it was made by a different hand than the
 * page it points at. It has no CJK glyphs, so four languages need another one;
 * Noto is what the headset and the phone would have fallen back to anyway. The
 * wordmark and the address are Latin on every card and stay Bricolage.
 */
const CJK_FACE = {
  ja: 'Noto Sans JP',
  ko: 'Noto Sans KR',
  'zh-Hant': 'Noto Sans TC',
  'zh-Hans': 'Noto Sans SC',
};

const isCjk = (code) => code in CJK_FACE;

/** Fetch a family from Google Fonts and put it where sharp can open it. */
async function installFont(family, weight) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  // An old user agent, deliberately: a modern one is answered with woff2, and
  // this needs TrueType.
  const css = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then((r) => r.text());
  const ttf = css.match(/https:\/\/fonts\.gstatic\.com[^)]*\.ttf/)?.[0];
  if (!ttf) throw new Error(`no TrueType URL for ${family} in the Google Fonts response`);

  const bytes = Buffer.from(await fetch(ttf).then((r) => r.arrayBuffer()));
  const path = join(FONT_DIR, `${family.replace(/\s+/g, '-')}-${weight}.ttf`);
  writeFileSync(path, bytes);
  console.log(`  ${family.padEnd(21)} ${String(Math.round(bytes.length / 1024)).padStart(5)} KB`);
  return path;
}

const escapeMarkup = (s) =>
  s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/**
 * One run of text as its own image, coloured and tracked.
 *
 * Pango markup rather than sharp options, because that is where colour and
 * letter-spacing live; `letter_spacing` is in 1024ths of a point, which is why
 * the numbers look the way they do.
 */
function textLayer({ text, family, size, fill, tracking = 0, fontfile }) {
  const span = `<span foreground="${fill}"${tracking ? ` letter_spacing="${Math.round(tracking * 1024)}"` : ''}>${escapeMarkup(text)}</span>`;
  return sharp({
    text: { text: span, font: `${family} ${size}`, fontfile, rgba: true, dpi: 72 },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

/**
 * Break a tagline into at most two lines.
 *
 * The budget is in characters because there is no way to measure a string here
 * before drawing it, and the sizes leave room for being wrong. The longest
 * tagline is French at 51 characters, the shortest the Chinese pair at 12.
 */
function wrap(text, code) {
  const budget = isCjk(code) ? 20 : 30;
  if (text.length <= budget) return [text];

  // Written without spaces, so it breaks by character.
  if (isCjk(code)) {
    const cut = Math.ceil(text.length / 2);
    return [text.slice(0, cut), text.slice(cut)];
  }

  const lines = [''];
  for (const word of text.split(' ')) {
    const line = lines[lines.length - 1];
    if (line && (line + ' ' + word).length > budget && lines.length < 2) lines.push(word);
    else lines[lines.length - 1] = line ? line + ' ' + word : word;
  }
  return lines;
}

const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${GROUND}"/>
  <!-- A hairline of the accent along the top, so the card is not a black slab. -->
  <rect width="${WIDTH}" height="6" fill="${ACCENT}"/>
</svg>`;

mkdirSync(FONT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const brand = await installFont('Bricolage Grotesque', 700);
const cjkFiles = {};
for (const [code, family] of Object.entries(CJK_FACE)) {
  cjkFiles[code] = await installFont(family, 700);
}
console.log('');

for (const code of LOCALES) {
  const data = JSON.parse(readFileSync(join(ROOT, 'src/content/i18n', `${code}.json`), 'utf8'));
  const tagline = data.home.title;

  const wordmark = await textLayer({
    text: 'Slocgtory',
    family: 'Bricolage Grotesque',
    size: 84,
    fill: INK,
    tracking: -2,
    fontfile: brand,
  });

  const lines = [];
  for (const line of wrap(tagline, code)) {
    lines.push(
      await textLayer({
        text: line,
        family: isCjk(code) ? CJK_FACE[code] : 'Bricolage Grotesque',
        size: isCjk(code) ? 34 : 36,
        fill: MUTE,
        fontfile: isCjk(code) ? cjkFiles[code] : brand,
      }),
    );
  }

  const address = await textLayer({
    text: 'slocgtory.github.io',
    family: 'Bricolage Grotesque',
    size: 22,
    fill: MUTE,
    tracking: 1,
    fontfile: brand,
  });

  // Stacked from the wordmark down, so a two-line tagline pushes nothing off
  // the card and a one-line one does not leave a hole.
  const layers = [{ input: wordmark.data, left: MARGIN, top: 250 }];
  let y = 250 + wordmark.info.height + 26;
  for (const line of lines) {
    layers.push({ input: line.data, left: MARGIN + 2, top: y });
    y += line.info.height + 8;
  }
  layers.push({ input: address.data, left: MARGIN + 2, top: HEIGHT - MARGIN - address.info.height });

  const png = await sharp(Buffer.from(background))
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(join(OUT_DIR, `${code}.png`), png);
  console.log(`  public/og/${(code + '.png').padEnd(14)} ${(png.length / 1024).toFixed(1).padStart(5)} KB  ${tagline}`);
}

// The single English card every page used to point at. Nothing references it now.
const stale = join(ROOT, 'public', 'og.png');
if (existsSync(stale)) {
  rmSync(stale);
  console.log('\n  removed public/og.png (replaced by one card per language)');
}

/**
 * The tab icon: the first letter of the name, in the face the name is set in.
 *
 * Not a symbol. There was a drawn mark here - a puzzle piece - and it was
 * invented rather than given, which is not a thing to decide on somebody's
 * behalf. A letter from the wordmark says only what the wordmark already says,
 * and is meant to be replaced the day there is a real one.
 */
console.log('');
for (const size of [32, 180]) {
  const name = size === 32 ? 'icon.png' : 'apple-touch-icon.png';
  const glyph = await textLayer({
    text: 'S',
    family: 'Bricolage Grotesque',
    size: Math.round(size * 0.5),
    fill: '#FBFBFC',
    fontfile: brand,
  });
  const plate = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${ACCENT}"/>
  </svg>`;
  const bytes = await sharp(Buffer.from(plate))
    .composite([
      {
        input: glyph.data,
        left: Math.round((size - glyph.info.width) / 2),
        top: Math.round((size - glyph.info.height) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(ROOT, 'public', name), bytes);
  console.log(`  public/${name.padEnd(20)} ${size}x${size}  ${(bytes.length / 1024).toFixed(1)} KB`);
}

rmSync(FONT_DIR, { recursive: true, force: true });
