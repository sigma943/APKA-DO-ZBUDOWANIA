import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PKS Live',
    short_name: 'PKS Live',
    description: 'PKS Live - śledzenie autobusów na żywo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#00A3A2',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
