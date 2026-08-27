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

export const SITE_URL = 'https://slocgtory.github.io';

/** Markets each language is carried for, shown nowhere but useful when someone
 *  asks why a language is on the list. */
export const LOCALE_MARKETS = {
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
export const OG_LOCALES = {
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
