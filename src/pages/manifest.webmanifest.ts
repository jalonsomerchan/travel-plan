import { defaultLocale, siteConfig } from '../config/site';
import { useTranslations } from '../i18n/ui';
import { getBasePath, withBasePath } from '../utils/paths';

export function GET() {
  const t = useTranslations(defaultLocale);

  const manifest = {
    id: getBasePath(),
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: t('site.description'),
    start_url: getBasePath(),
    scope: getBasePath(),
    display: 'standalone',
    display_override: ['standalone', 'browser'],
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    categories: ['travel', 'productivity', 'utilities'],
    icons: [
      {
        src: withBasePath('favicon.svg'),
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
    },
  });
}
