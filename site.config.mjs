/**
 * The one place the language list lives.
 *
 * Imported by astro.config.mjs (for routing and the sitemap) and by
 * src/lib/i18n.ts (for the switcher and the alternate links). Two copies of
 * this list would drift the first time a language is added, and the symptom
 * would be a language that routes but never appears in the switcher.
 *
 * One language per official language of every market Meta sells Quest in.
 * Meta's own list is 25 countries and regions: Australia, Austria, Belgium,
 * Canada, Denmark, Finland, France, Germany, Iceland, Ireland, Italy, Japan,
 * Mexico, Netherlands, New Zealand, Norway, Poland, Singapore, South Korea,
 * Spain, Sweden, Switzerland, Taiwan, the United Kingdom and the United States.
 *
 * Two are worth spelling out, because guessing gets them wrong. Simplified
 * Chinese is here for **Singapore**, where it is an official language - not for
 * mainland China, which is not a Quest market at all. Traditional Chinese is
 * here for Taiwan. Malay and Tamil are also official in Singapore and are left
 * out: English is the language of administration and commerce there.
 *
 * Order is the order of the switcher: the canonical language, then Latin-script
 * Europe roughly by market size, then the Nordics, then East Asia.
 */
export const DEFAULT_LOCALE = 'en';

export const LOCALES = [
  'en',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pl',
  'da',
  'sv',
  'nb',
  'fi',
  'is',
  'ja',
  'ko',
  'zh-Hant',
  'zh-Hans',
];

/**
 * Where this site lives, and it is staying here.
 *
 * Settled on 2026-08-27 rather than left open, because this address is not only
 * an address. It goes into Meta's app submission dashboard as the privacy
 * policy URL and is re-validated automatically from then on, so moving to a
 * custom domain after submitting is a change in Meta's console and a reset of
 * everything the search engines have indexed - cheap now, expensive later. The
 * answer is: no custom domain, no CNAME.
 *
 * Everything derived - canonical links, the sixteen hreflang sets, og:url, the
 * sitemap - reads this constant. `public/robots.txt` carries the only second
 * copy, because a static file cannot read a module.
 */
/**
 * Every locale-keyed table below is checked against `LOCALES` the moment this
 * module loads, and a gap is a thrown error rather than a quiet blank.
 *
 * There are three such tables now, and this file's own comment used to claim it
 * was "the one place the language list lives". That stopped being true the
 * second one appeared. Adding a language and forgetting `OG_LOCALES` produced a
 * page whose `og:locale` had no value - nothing failed, nothing warned, and the
 * only way to notice was to read the head of a built page.
 *
 * The list is still in one place. What was missing was anything making the
 * others follow it.
 */
function forEveryLocale(name, table) {
  const missing = LOCALES.filter((code) => !(code in table));
  const extra = Object.keys(table).filter((code) => !LOCALES.includes(code));
  if (missing.length || extra.length) {
    throw new Error(
      `${name} does not match LOCALES` +
        (missing.length ? `
  missing: ${missing.join(', ')}` : '') +
        (extra.length ? `
  not a locale: ${extra.join(', ')}` : ''),
    );
  }
  return table;
}

/** The sitemap wants locale -> hreflang, which here is the identity. Derived
 *  rather than written out, because a hand-kept copy of the same sixteen names
 *  is a copy that can disagree. */
export const SITEMAP_LOCALES = Object.fromEntries(LOCALES.map((code) => [code, code]));

export const SITE_URL = 'https://slocgtory.github.io';

/** Markets each language is carried for, shown nowhere but useful when someone
 *  asks why a language is on the list. */
const LOCALE_MARKETS_TABLE = {
  en: 'United States, United Kingdom, Canada, Ireland, Australia, New Zealand, Singapore',
  de: 'Germany, Austria, Switzerland',
  fr: 'France, Belgium, Canada, Switzerland',
  es: 'Spain, Mexico',
  it: 'Italy, Switzerland',
  nl: 'Netherlands, Belgium',
  pl: 'Poland',
  da: 'Denmark',
  sv: 'Sweden',
  nb: 'Norway',
  fi: 'Finland',
  is: 'Iceland',
  ja: 'Japan',
  ko: 'South Korea',
  'zh-Hant': 'Taiwan',
  'zh-Hans': 'Singapore',
};

/* Not exported: nothing imports it, and an export with no importer reads like a
   thing somebody uses. It is here to answer "why is this language on the list",
   and it is checked so the answer cannot go missing for a language. */
export const LOCALE_MARKETS = forEveryLocale('LOCALE_MARKETS', LOCALE_MARKETS_TABLE);

/**
 * When the privacy policy last changed, machine-readable.
 *
 * One constant rather than a field per language: the date is the same in all
 * sixteen, only the words around it differ. Each translation writes it out its
 * own way - "27 August 2026", "27 sierpnia 2026", "2026年8月27日" - and this is
 * what goes in the `datetime` attribute so a crawler, a reader mode or anything
 * else parsing the page gets one unambiguous answer.
 */
export const POLICY_UPDATED = '2026-08-27';

/**
 * Open Graph locales, which are not the same strings as the routes.
 *
 * OG wants `language_TERRITORY`, so a bare `en` is not a value it recognises
 * and neither is `zh_Hant` - the site was emitting both. The territory is the
 * one this language is carried for; where a language covers several markets it
 * is the largest, because OG has room for exactly one answer per tag and the
 * alternates below carry the rest of the languages, not the rest of the
 * countries.
 */
const OG_LOCALES_TABLE = {
  en: 'en_US',
  de: 'de_DE',
  fr: 'fr_FR',
  es: 'es_ES',
  it: 'it_IT',
  nl: 'nl_NL',
  pl: 'pl_PL',
  da: 'da_DK',
  sv: 'sv_SE',
  nb: 'nb_NO',
  fi: 'fi_FI',
  is: 'is_IS',
  ja: 'ja_JP',
  ko: 'ko_KR',
  // Traditional Chinese is here for Taiwan and Simplified for Singapore, which
  // is why these two are not the pair people expect.
  'zh-Hant': 'zh_TW',
  'zh-Hans': 'zh_SG',
};

export const OG_LOCALES = forEveryLocale('OG_LOCALES', OG_LOCALES_TABLE);
