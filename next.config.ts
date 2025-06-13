
import type {NextConfig} from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // Prevents auto-registration script, helping Firebase Auth init
  skipWaiting: true, // Recommended for better PWA update flow once installed
  disable: false, // Ensure PWA features are generated
  // manifest object removed from here
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
