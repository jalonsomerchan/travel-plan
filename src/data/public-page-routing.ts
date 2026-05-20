import type { Locale } from '../config/site';
import { getPublicPages } from './public-pages';

export function getPublicPageBySlug(locale: Locale, slug: string | undefined) {
  return getPublicPages(locale).find((page) => page.slug === slug);
}
