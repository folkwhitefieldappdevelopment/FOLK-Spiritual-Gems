import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FOLK Spiritual Gems',
    short_name: 'FOLK GEMS',
    description: 'Outreach and Contact Management for FOLK Bangalore.',
    start_url: '/',
    display: 'standalone',
    background_color: '#11121d',
    theme_color: '#3F51B5',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}