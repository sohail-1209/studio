
// src/app/layout.tsx

import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYNORA',
  description: 'SYNORA - Connect, Share, and Discover.',
  manifest: '/manifest.webmanifest',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#7E57C2' },
    { media: '(prefers-color-scheme: dark)', color: '#7E57C2' },
  ],
  icons: {
    icon: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png',
    apple: 'https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png',
  },
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
};

// Script to set initial theme to prevent FOUC (Flash of Unstyled Content)
const InitializeTheme = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var e=localStorage.getItem("theme");if(e){document.documentElement.classList.add(e)}else{var t=window.matchMedia("(prefers-color-scheme: dark)").matches;t&&document.documentElement.classList.add("dark")}}catch(e){console.error("Error setting initial theme:",e)}})();`,
    }}
  />
);


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-y-scroll">
      <head>
        <InitializeTheme />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Tangerine:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
