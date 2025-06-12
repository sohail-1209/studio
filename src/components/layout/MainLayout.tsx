
// src/components/layout/MainLayout.tsx
'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar'; // Simplified AppSidebar
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/shared/Spinner';
import {
  SidebarProvider,
  Sidebar as UISidebar,
  SidebarInset,
} from '@/components/ui/sidebar'; // Using the forcefully styled Sidebar and SidebarInset

interface MainLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: MainLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      console.log("MainLayout: Auth not loading and no user, redirecting to /login");
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size={48} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen"> {/* Root flex container */}
      <UISidebar
        style={{
          backgroundColor: 'red', // Direct inline style for testing
          width: '256px',        // Direct inline style for testing
          borderRight: '4px solid black',
          position: 'sticky',
          top: '0',
          height: '100vh',
          zIndex: 100, // High z-index
          flexShrink: 0,
        }}
        // We keep some classes for flex behavior if needed, but critical visual styles are inline
        className="flex flex-col"
      >
        <AppSidebar />
      </UISidebar>
      <SidebarInset> {/* This is the div with !bg-blue-500 and flex-1 */}
        {/* The direct child of SidebarInset gets the padding and max-width for content */}
        <div
          className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8"
          // The blue background is now directly on SidebarInset from ui/sidebar.tsx
        >
          {children}
        </div>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  // SidebarProvider forces an "open" and "desktop" state for the sidebar context
  return (
    <SidebarProvider open={true} onOpenChange={() => { /* no-op */ }}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
