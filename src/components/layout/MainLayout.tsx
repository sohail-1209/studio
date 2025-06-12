
// src/components/layout/MainLayout.tsx
'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/shared/Spinner';
import {
  SidebarProvider,
  Sidebar as UISidebar, // Renamed to avoid conflict if we had a local Sidebar
  SidebarInset,
} from '@/components/ui/sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

// This component assumes Firebase initialization is handled and auth state is available
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
    console.log("MainLayout: Auth is loading, showing spinner.");
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size={48} />
      </div>
    );
  }

  if (!user) {
    console.log("MainLayout: No user, rendering null (should be redirected).");
    // This case should ideally be handled by the redirect in useEffect,
    // but it's a fallback. The redirect might take a render cycle.
    return null;
  }

  console.log("MainLayout: User authenticated, rendering main layout structure.");
  // Forced desktop layout for debugging navbar visibility
  return (
    <div className="flex min-h-screen"> {/* Removed bg-background here, SidebarInset has it */}
      <UISidebar> {/* This is the Sidebar component from ui/sidebar.tsx (imported as UISidebar) */}
        <AppSidebar />
      </UISidebar>
      <SidebarInset> {/* This is the SidebarInset component from ui/sidebar.tsx */}
        {/* This div wraps the actual page content */}
        <div
          className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8"
          style={{ backgroundColor: 'hsl(var(--main-content-debug-background))' }} // Apply blue debug background
        >
          {children}
        </div>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  // Force sidebar to be open and in desktop mode (isMobile=false) for debugging
  return (
    <SidebarProvider open={true} onOpenChange={() => { /* no-op for fixed sidebar */ }}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
