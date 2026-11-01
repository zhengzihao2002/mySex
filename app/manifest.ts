import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'mySex',
    short_name: 'mySex',
    description: 'The private, 18+ sex & cycle tracker for two.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e070d',
    theme_color: '#0e070d',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
