import { getEntry } from 'astro:content';
import { LOCALES, DEFAULT_LOCALE } from '../../site.config.mjs';

/** The three fixed pages, plus one address per app under the catalogue. The
 *  template literal is what lets `localeUrl` stay a single line: every page
 *  except home is its own path with a trailing slash. */
export type Page = 'home' | 'apps' | 'privacy' | `apps/${string}`;

/**
 * Where a page lives for a given language.
 *
 * The canonical language has no prefix, so English is `/` and `/privacy/` with
 * no redirect hop to reach it. That matters more than it looks: the privacy
 * address is pasted into Meta's submission form once and then re-validated
 * automatically, and every hop is a thing that can answer wrongly.
 */
export function localeUrl(page: Page, locale: string): string {
  const leaf = page === 'home' ? '' : `${page}/`;
  return locale === DEFAULT_LOCALE ? `/${leaf}` : `/${locale}/${leaf}`;
}

/** Every language's URL for one page, in switcher order, for hreflang. */
export function alternatesFor(page: Page) {
  return LOCALES.map((code) => ({ code, url: localeUrl(page, code) }));
}

export async function loadLocale(code: string) {
  const entry = await getEntry('i18n', code);
  if (!entry) throw new Error(`no translation file for locale "${code}"`);
  return entry.data;
}

/** Locales other than the canonical one - the ones that get a prefixed route. */
export const TRANSLATED_LOCALES = LOCALES.filter((c) => c !== DEFAULT_LOCALE);

// --- the order the switcher lists them in ------------------------------------

type Script = 'latin' | 'japanese' | 'korean' | 'hant' | 'hans';

/**
 * Which writing system each language's own name is in.
 *
 * Declared rather than sniffed from the characters at run time. Sniffing gets
 * Japanese wrong: 日本語 is three Han characters with no kana in it, so it is
 * indistinguishable from Chinese by inspection, and the two want to sort apart.
 */
const SCRIPT: Record<string, Script> = {
  ja: 'japanese',
  ko: 'korean',
  'zh-Hant': 'hant',
  'zh-Hans': 'hans',
};

const scriptOf = (code: string): Script => SCRIPT[code] ?? 'latin';

/** The order scripts take when none of them is the reader's. */
const ROOT_ORDER: Script[] = ['latin', 'japanese', 'korean', 'hant', 'hans'];

const FOLD: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a', ā: 'a', ą: 'a',
  æ: 'ae',
  ç: 'c', ć: 'c', č: 'c',
  ď: 'd', đ: 'd', ð: 'd',
  é: 'e', è: 'e', ê: 'e', ë: 'e', ē: 'e', ę: 'e', ě: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ī: 'i',
  ł: 'l',
  ñ: 'n', ń: 'n', ň: 'n',
  ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o', ø: 'o', ō: 'o',
  œ: 'oe',
  ř: 'r',
  ś: 's', š: 's', ş: 's',
  ß: 'ss',
  ť: 't', þ: 't',
  ú: 'u', ù: 'u', û: 'u', ü: 'u', ū: 'u', ů: 'u',
  ý: 'y', ÿ: 'y',
  ź: 'z', ż: 'z', ž: 'z',
};

/**
 * A name reduced to what decides its place in an alphabet.
 *
 * Primary strength, in the Unicode Collation Algorithm's terms: accents and case
 * are differences at the second and third level and must not move a word past
 * another one. Comparing code points instead files `Íslenska` after `Svenska`,
 * because a capital I-acute sits above every unaccented letter - which is not
 * where anyone hunting for Icelandic would think to look.
 *
 * Not a general collator. It folds the Latin letters that turn up in the names
 * of languages, a short and closed list, and leaves the other scripts alone -
 * they sort into their own group before this is consulted. `Intl.Collator`
 * would be the real answer and is one line, but it orders by the *reader's*
 * locale, and this list is read by all sixteen at once.
 */
function foldPrimary(name: string): string {
  return [...name.toLowerCase()].map((c) => FOLD[c] ?? c).join('');
}

/**
 * Every locale, in the order this reader should be shown them.
 *
 * **There is no correct order across scripts, and this is CLDR's answer to
 * that.** Their collation guidelines say a language's own script sorts before
 * the others - the `reorder` setting - naming Latin, Cyrillic and CJK as exactly
 * the case it is for. Whether 日本語 belongs above or below Nederlands has no
 * answer in the abstract; which of them the reader can read has an obvious one.
 *
 * So the reader's own script leads, then the rest in a fixed order, and inside a
 * script by the name at primary strength.
 */
export function localesInReadingOrder(
  current: string,
  endonym: (code: string) => string
): string[] {
  const readers = scriptOf(current);

  const rank = (code: string) => {
    const script = scriptOf(code);
    if (script === readers) return 0;
    const at = ROOT_ORDER.indexOf(script);
    return 1 + (at === -1 ? ROOT_ORDER.length : at);
  };

  return [...LOCALES].sort((a, b) => {
    const byScript = rank(a) - rank(b);
    if (byScript !== 0) return byScript;
    return foldPrimary(endonym(a)).localeCompare(foldPrimary(endonym(b)), 'en');
  });
}

export { LOCALES, DEFAULT_LOCALE };

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/**
 * The smallest markup that the copy actually needs: **bold**, `code`, and
 * [text](url). Nothing else is recognised.
 *
 * A full Markdown renderer would be the obvious reach, but the strings here are
 * single sentences inside a legal document, and every feature it would add -
 * raw HTML passthrough, reference links, auto-linking - is a way for a
 * translation file to put something unintended on the page. This escapes
 * first and then permits exactly three things.
 */
export function inline(source: string): string {
  let out = source.replace(/[&<>"]/g, (c) => ESCAPES[c]);

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, text: string, href: string) => {
    const external = /^https?:\/\//i.test(href);
    const rel = external ? ' rel="noopener"' : '';
    return `<a href="${href}"${rel}>${text}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  return out;
}
