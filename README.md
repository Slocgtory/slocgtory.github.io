# slocgtory.github.io

The Slocgtory site: what has been made, and the privacy policy that covers it.

Built with [Astro](https://astro.build). Sixteen languages, nothing bundled, no
third-party requests at runtime.

## Why it looks the way it does

**Nothing loads from anyone else.** Fonts are downloaded at build time by
Astro's Fonts API and served from this origin. There is no analytics, no embed,
no font CDN. That is not a preference: the privacy policy published here tells
visitors they are not tracked, and a page that pulls a font from Google hands
every visitor's IP address to Google. The claim and the markup have to agree.

Verified on the built output: zero `.js` files, and the only external hosts
named anywhere are `www.meta.com`, for the link to Meta's own privacy policy,
and `schema.org`, which is a vocabulary identifier in the structured data and
is never fetched.

**"Nothing bundled" is not "no JavaScript".** About 8KB of it is inlined into
each page, and it is all there is: the theme stamp that has to run before the
first paint, the one place that works out which language the browser is asking
for, the settings panel, the language note, and the 404's switch. Nothing is
fetched to run any of it, and every one of them is a progressive enhancement -
the pages work with scripting off, minus the parts that cannot exist without
it.

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
    src/layouts/Base.astro    head, masthead, structured data
    src/components/           three page bodies, the settings panel, the
                              language note
    src/styles/global.css     the whole design system, including print
    site.config.mjs           the language list and the tables keyed by it
    public/og/                one social card per language
    scripts/check-translations.mjs
    scripts/seal-csp.mjs      hashes the inline scripts into the policy
    scripts/check-build.mjs   reads dist/ and asks whether it is right
    tools/make-og-card.mjs    redraws the cards and the favicons

## Working on it

    npm install
    npm run dev        local preview
    npm run build      the whole pipeline (see below)
    npm run check      are the translations current?
    npm run check:build  is the built output right? (build runs this too)
    npm run restamp    mark them current, after actually re-reading them

## What `npm run build` actually does

Four steps, in this order, and the order matters:

1. `check-translations.mjs` - structure drift stops here.
2. `astro build` - writes `dist/`.
3. `seal-csp.mjs` - hashes every inline script and style in the built files and
   writes them into each page's Content-Security-Policy. The hashes are of the
   final bytes, after minification, so they cannot be written by hand.
4. `check-build.mjs` - reads `dist/` back and checks what it says.

Steps 3 and 4 exist because a whole class of fault is invisible in the source.
The 404 is built through the same layout as every other page and passes
`page="home"`, because that is how it gets a header - and so it inherited a
canonical pointing at `/` and sixteen hreflang links to the home pages, telling
every crawler that the error page was the front door. The source read correctly.
It was found by chance, and step 4 is so the next one is not.

## The policy the pages carry

Every page ships a Content-Security-Policy in a `<meta>` element, and the point
is not generic hardening. The privacy policy here tells visitors that nothing
about them is sent anywhere, and `connect-src 'none'` makes the browser enforce
that rather than the reader having to take it on trust: an analytics snippet
added in a hurry, or a font pulled from a CDN, is refused instead of quietly
making the claim false.

Inline scripts and styles are allowed by hash, not by `'unsafe-inline'`, which
would have let anything injected run. Verified in a browser: an outbound
`fetch`, an injected inline script and a third-party image are all refused, and
every control on the page still works.

One directive is missing and cannot be added. `frame-ancestors` is ignored in a
`<meta>` element - it needs a real HTTP header, and GitHub Pages does not let
anyone set one.

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
2. Add the code to `LOCALES` in `site.config.mjs`, then to the two tables keyed
   by it in the same file: `OG_LOCALES` and `LOCALE_MARKETS`.
3. `node tools/make-og-card.mjs` to draw its social card.
4. `npm run build`.

Steps 2 and 4 are in that order because they check each other. Every table keyed
by a locale is compared against `LOCALES` when the config loads, so a forgotten
entry stops the build and names the table and the language - it used to ship a
page whose `og:locale` had no value, silently. The sitemap's copy of the list is
derived rather than kept by hand, for the same reason.

## Deploying

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. Pages must be set to **GitHub Actions** as its
source in the repository settings.
