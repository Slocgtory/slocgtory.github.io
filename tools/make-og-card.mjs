#!/usr/bin/env node
/**
 * Draws the social card at public/og.png, and the favicons beside it.
 *
 * The image every chat window, forum and search result shows instead of a bare
 * link. Without one the site shares as a line of blue text, which for a studio
 * page that will be linked from a store listing is a wasted first impression.
 *
 *   node tools/make-og-card.mjs
 *
 * Run rarely - whenever the wordmark or the palette changes - and the result is
 * committed, because a card is not worth a build-time dependency on the network.
 * The typeface is fetched here rather than vendored: Bricolage Grotesque is what
 * the site's headings are set in, and a card in some other face would announce
 * that it was made by a different hand than the page it points at.
 *
 * Needs network. Everything else about this site builds offline.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'og.png');

// The two sizes every platform crops from. 1200x630 is the one they all accept.
const WIDTH = 1200;
const HEIGHT = 630;

// Straight from src/styles/global.css, dark set.
const GROUND = '#0C0D10';
const INK = '#E9EAEE';
const MUTE = '#858C99';
const ACCENT = '#2340C8';

async function brandFont() {
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  ).then((r) => r.text());

  const url = css.match(/https:\/\/fonts\.gstatic\.com[^)]*\.ttf/)?.[0];
  if (!url) throw new Error('no TrueType URL in the Google Fonts response');

  const bytes = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  return bytes.toString('base64');
}

const font = await brandFont();

// The same mark as public/icon.svg, drawn at card size.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <style>
      @font-face {
        font-family: 'Brand';
        src: url(data:font/ttf;base64,${font}) format('truetype');
        font-weight: 700;
      }
    </style>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="${GROUND}"/>

  <!-- A hairline of the accent along the top, so the card is not a black slab. -->
  <rect width="${WIDTH}" height="6" fill="${ACCENT}"/>

  <text x="110" y="330" font-family="Brand" font-weight="700" font-size="112"
        letter-spacing="-3" fill="${INK}">Slocgtory</text>
  <text x="114" y="392" font-family="Brand" font-weight="700" font-size="32"
        letter-spacing="1" fill="${MUTE}">slocgtory.github.io</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(OUT, png);
console.log(`  public/og.png       1200x630  ${(png.length / 1024).toFixed(1)} KB`);

/**
 * The tab icon: the first letter of the name, in the face the name is set in.
 *
 * Not a symbol. There was a drawn mark here - a puzzle piece - and it was
 * invented rather than given, which is not a thing to decide on somebody's
 * behalf. A letter from the wordmark says only what the wordmark already says,
 * and is meant to be replaced the day there is a real one.
 */
const letter = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs><style>@font-face{font-family:'Brand';src:url(data:font/ttf;base64,${font}) format('truetype');font-weight:700;}</style></defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${ACCENT}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Brand" font-weight="700" font-size="${size * 0.62}"
        fill="#FBFBFC">S</text>
</svg>`;

for (const size of [32, 180]) {
  const name = size === 32 ? 'icon.png' : 'apple-touch-icon.png';
  const bytes = await sharp(Buffer.from(letter(size))).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(ROOT, 'public', name), bytes);
  console.log(`  public/${name.padEnd(19)} ${size}x${size}  ${(bytes.length / 1024).toFixed(1)} KB`);
}
