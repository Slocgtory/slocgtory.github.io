// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { LOCALES, DEFAULT_LOCALE, SITE_URL } from './site.config.mjs';

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
      i18n: {
        defaultLocale: DEFAULT_LOCALE,
        locales: {
          en: 'en',
          pl: 'pl',
          de: 'de',
          fr: 'fr',
          es: 'es',
          it: 'it',
          nl: 'nl',
          da: 'da',
          fi: 'fi',
          is: 'is',
          nb: 'nb',
          sv: 'sv',
          ja: 'ja',
          ko: 'ko',
          'zh-Hant': 'zh-Hant',
          'zh-Hans': 'zh-Hans',
        },
      },
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
   */
  fonts: [
    {
      name: 'Bricolage Grotesque',
      cssVariable: '--font-display',
      provider: fontProviders.fontsource(),
      weights: [500, 600, 700],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'Public Sans',
      cssVariable: '--font-body',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.fontsource(),
      weights: [400, 500],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
