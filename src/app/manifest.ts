import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'unfold — Anonim Dertleşme ve Dayanışma Forumu',
    short_name: 'unfold',
    description:
      'Aynı dertlere sahip insanların yargılanmadan birbirini kolayca bulabildiği anonim dertleşme platformu.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080c14',
    theme_color: '#080c14',
    lang: 'tr',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
