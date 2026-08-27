import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * One file per language, validated on every build.
 *
 * The point of putting a schema here rather than trusting the files: hand
 * written translations do not fail loudly. A missing key renders as an empty
 * heading, a renamed key renders as nothing at all, and both look fine in the
 * language the author happens to read. Ten languages make that a certainty
 * rather than a risk.
 *
 * So every field below is required. A translation that is missing one does not
 * ship a thin page - it stops the build and names the file and the field.
 * Freshness is a separate question and is handled by scripts/check-translations.mjs.
 */

const section = z.object({
  h: z.string().min(1),
  p: z.array(z.string().min(1)).min(1),
  list: z.array(z.string().min(1)).optional(),
});

const app = z.object({
  name: z.string().min(1),
  status: z.string().min(1),
  desc: z.string().min(1),
});

const i18n = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: './src/content/i18n',
    // Keep the filename as the id, exactly. The default slugifies, which
    // lowercases - and `zh-Hant.json` then answers to `zh-hant` while every
    // route, `lang` attribute and `hreflang` link still says `zh-Hant`. The
    // build failed on precisely that, and only for the two Chinese locales,
    // because they are the only codes here with a capital letter in them.
    generateId: ({ entry }) => entry.replace(/\.json$/, ''),
  }),
  schema: z.object({
    /** Endonym: the language's name in that language, which is how a speaker
     *  finds their own row in the switcher. */
    name: z.string().min(1),
    dir: z.enum(['ltr', 'rtl']).default('ltr'),

    /** Fingerprint of the English file this translation was written against.
     *  When English moves, this stops matching and the check script says which
     *  languages have fallen behind. English carries the literal string
     *  "canonical" - it cannot be stale against itself. */
    sourceHash: z.string().min(1),

    site: z.object({
      skip: z.string().min(1),
      navLabel: z.string().min(1),
      /** Names the one control that holds both choices. */
      settingsLabel: z.string().min(1),
      langLabel: z.string().min(1),

      /** Offered to a visitor whose browser speaks this language, written in it.
       *  A Pole reading the English page has to be offered Polish in Polish, or
       *  it is not an offer. */
      otherLanguage: z.string().min(1),
      dismiss: z.string().min(1),
      email: z.string().email(),
      /** One entry. The wordmark is the link home, so there is no label for it. */
      nav: z.object({
        privacy: z.string().min(1),
      }),

      /** The appearance control. Four words, and all four are shown. */
      theme: z.object({
        label: z.string().min(1),
        /** Follow the operating system, which is the default and not a colour. */
        system: z.string().min(1),
        light: z.string().min(1),
        dark: z.string().min(1),
      }),

      notFoundTitle: z.string().min(1),
      notFoundBody: z.string().min(1),
    }),

    home: z.object({
      metaTitle: z.string().min(1),
      metaDescription: z.string().min(1),
      title: z.string().min(1),
      intro: z.string().min(1),
      appsHeading: z.string().min(1),
      apps: z.array(app).min(1),
      appsNote: z.string().min(1),
      contactHeading: z.string().min(1),
      contactBody: z.string().min(1),
    }),

    privacy: z.object({
      metaTitle: z.string().min(1),
      metaDescription: z.string().min(1),
      title: z.string().min(1),
      updated: z.string().min(1),
      /** Shown only on translations: says the English text governs. Empty on
       *  English itself, which is why this one field may be blank. */
      canonicalNote: z.string(),
      summary: z.string().min(1),
      sections: z.array(section).min(1),
    }),
  }),
});

export const collections = { i18n };
