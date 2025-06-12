
import type {NextConfig} from 'next';
import type { PWAConfig } from 'next-pwa';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // You can add more PWA options here if needed
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
