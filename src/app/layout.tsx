
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synora', // Changed from NExCHAT
  description: 'Synora - Connect, Share, and Discover.', // Updated description
  manifest: '/manifest.json',
};

// Script to set initial theme to prevent FOUC (Flash of Unstyled Content)
const InitializeTheme = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          try {
            const theme = localStorage.getItem('theme');
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else if (!theme) { // Default to light if no theme explicitly set
              document.documentElement.classList.remove('dark');
            }
            // If theme === 'light', class is already removed or not added
          } catch (e) {
            console.error('Error setting initial theme:', e);
          }
        })();
      `,
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <InitializeTheme />
        <meta name="theme-color" content="#588558" /> {/* Updated theme color to match primary */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png" /> {/* Updated apple-touch-icon */}
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
