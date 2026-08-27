// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { LOCALES, DEFAULT_LOCALE, SITE_URL, SITEMAP_LOCALES } from './site.config.mjs';

export { LOCALES, DEFAULT_LOCALE } from './site.config.mjs';

export default defineConfig({
  site: SITE_URL,

  // Directory-style URLs. `/privacy/` survives being pasted into a form and
  // re-typed by hand better than `/privacy`, and this address gets pasted into
  // Meta's submission dashboard once and then re-validated automatically.
  trailingSlash: 'always',

  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: LOCALES,
    routing: {
      // English lives at `/` and `/privacy/`, with no `/en/` prefix and no
      // redirect hop to get there.
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      // Derived from LOCALES, not written out again. This was a hand-kept copy
      // of the same sixteen names, which is a copy that can disagree.
      i18n: { defaultLocale: DEFAULT_LOCALE, locales: SITEMAP_LOCALES },
    }),
  ],

  /**
   * Fonts are downloaded at build time and served from this origin. Nothing on
   * this site reaches a third party at runtime - no font CDN, no analytics, no
   * embeds. That is not decoration: the privacy policy published here says
   * visitors are not tracked, and a page that pulls a font from Google hands
   * every visitor's IP address to Google. The claim and the markup have to
   * agree, and self-hosting is how you get real typography and keep the claim.
   *
   * Latin and Latin Extended only, which covers every Latin-script locale here
   * including Polish diacritics. CJK is left to the system stack in global.css:
   * a self-hosted Japanese or Chinese face is several megabytes, and every Quest
   * and every phone already ships a good one.
   *
   * Every weight and style below is one the stylesheet actually asks for, and
   * the list is shorter than it was for two reasons worth writing down.
   *
   * `styles: ['normal']` is stated on all three because **the default is
   * ['normal', 'italic']**. Two of these never asked for italic and got it
   * anyway. Nothing here can produce an italic: `inline()` emits only <a>,
   * <strong> and <code>, and there is no <em> in any of the 49 built pages.
   *
   * The 500s went the same way - measured, not guessed. Display is used at 600
   * for headings and 700 for the wordmark; body at 400 and 600; only the mono
   * labels use 500. Together that was 20 dead @font-face rules out of 52, and
   * they were inlined into every page.
   */
  fonts: [
    {
      name: 'Bricolage Grotesque',
      cssVariable: '--font-display',
      provider: fontProviders.fontsource(),
      // 600 for h1/h2/h3, 700 for the wordmark. Nothing sets 500.
      weights: [600, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Public Sans',
      cssVariable: '--font-body',
      provider: fontProviders.fontsource(),
      // 400 for running text, 600 for <strong> and the current tab. No 500.
      weights: [400, 600],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.fontsource(),
      // 400 for <code> and the policy date, 500 for the margin labels.
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
