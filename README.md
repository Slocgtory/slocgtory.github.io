# slocgtory.github.io

The Slocgtory site: what has been made, and the privacy policy that covers it.

Built with [Astro](https://astro.build). Sixteen languages, no client-side
JavaScript, no third-party requests at runtime.

## Why it looks the way it does

**Nothing loads from anyone else.** Fonts are downloaded at build time by
Astro's Fonts API and served from this origin. There is no analytics, no embed,
no font CDN. That is not a preference: the privacy policy published here tells
visitors they are not tracked, and a page that pulls a font from Google hands
every visitor's IP address to Google. The claim and the markup have to agree.

Verified on the built output - the only external URL in the whole site is the
link to Meta's own privacy policy, and there are zero `.js` files.

**English is authoritative.** Every other language carries a note saying so and
links back to the English text. This is standard for a document that states what
data an app collects, and it is the honest position when the translations were
not written by native speakers.

**The language list is chosen by market, not by speaker count.** One language
per official language of every country Meta sells Quest in - 25 of them. That is
why Simplified Chinese is here (Singapore) and why it is not here for mainland
China, which is not a Quest market at all.

## Layout

    src/content/i18n/*.json   one file per language - all the words live here
    src/content.config.ts     schema; a missing field fails the build
    src/pages/                routes: English at /, others at /<lang>/
    src/layouts/Base.astro    head, header, footer, language switcher
    src/components/           the two page bodies
    src/styles/global.css     the whole design system
    site.config.mjs           the language list, in one place
    scripts/check-translations.mjs

## Working on it

    npm install
    npm run dev        local preview
    npm run build      checks translations, then builds to dist/
    npm run check      are the translations current?
    npm run restamp    mark them current, after actually re-reading them

## Keeping sixteen translations honest

Two things can go wrong with hand-written translations, and neither announces
itself. The schema catches the first: a missing or renamed field stops the
build and names the file. `scripts/check-translations.mjs` catches the second.

Every translation records `sourceHash`, a fingerprint of the English file it was
written from. Change English and the fingerprints stop matching, so the check
names exactly which languages have fallen behind. It also compares structure -
same number of sections, same number of bullets - because a translation missing
a section is not a typo in a privacy policy.

Structure drift fails the build. Staleness only warns locally, and fails in its
own CI job that does not gate the deploy, so correcting the English page is
never blocked by pending translations.

After genuinely re-reading a translation against English, `npm run restamp`
marks it current.

## Adding a language

1. Copy `src/content/i18n/en.json` to `<code>.json` and translate it.
2. Add the code to `LOCALES` in `site.config.mjs` and to the sitemap map in
   `astro.config.mjs`.
3. `npm run build`. The schema will tell you about anything missed.

## Deploying

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. Pages must be set to **GitHub Actions** as its
source in the repository settings.
