
import type {NextConfig} from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // Prevents auto-registration script, helping Firebase Auth init
  skipWaiting: true, // Recommended for better PWA update flow once installed
  disable: false, // Ensure PWA features are generated
  manifest: {
    name: 'Synora',
    short_name: 'Synora',
    description: 'Synora - Connect, Share, and Discover.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FCFAF9', // Approx hsl(45 30% 98.5%)
    theme_color: '#588558', // Approx hsl(120 28% 42%)
    icons: [
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  },
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

