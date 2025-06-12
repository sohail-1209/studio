
import type {NextConfig} from 'next';
import type { PWAConfig } from 'next-pwa';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  manifest: {
    name: 'Synora',
    short_name: 'Synora',
    description: 'Synora - Connect, Share, and Discover.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FCFAF9', // Approx hsl(45 30% 98.5%)
    theme_color: '#588558', // Approx hsl(120 28% 42%)
    icons: [
      { src: 'https://placehold.co/72x72.png?text=S', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
      { src: 'https://placehold.co/96x96.png?text=S', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
      { src: 'https://placehold.co/128x128.png?text=S', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
      { src: 'https://placehold.co/144x144.png?text=S', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
      { src: 'https://placehold.co/152x152.png?text=S', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
      { src: 'https://placehold.co/192x192.png?text=S', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: 'https://placehold.co/384x384.png?text=S', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
      { src: 'https://placehold.co/512x512.png?text=S', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  // fallbacks: {
  //   document: '/offline', // if you want to fallback to a custom offline page
  // },
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'toppng.com', 
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
