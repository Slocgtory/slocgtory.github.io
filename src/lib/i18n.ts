import { getEntry } from 'astro:content';
import { LOCALES, DEFAULT_LOCALE } from '../../site.config.mjs';

export type Page = 'home' | 'privacy';

/**
 * Where a page lives for a given language.
 *
 * The canonical language has no prefix, so English is `/` and `/privacy/` with
 * no redirect hop to reach it. That matters more than it looks: the privacy
 * address is pasted into Meta's submission form once and then re-validated
 * automatically, and every hop is a thing that can answer wrongly.
 */
export function localeUrl(page: Page, locale: string): string {
  const leaf = page === 'home' ? '' : 'privacy/';
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
