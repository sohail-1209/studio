
// src/components/layout/MainLayout.tsx
'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/shared/Spinner';
import {
  SidebarProvider,
  Sidebar as UISidebar, // Renamed to avoid conflict
  SidebarInset,
} from '@/components/ui/sidebar';
import { MobileHeader } from './MobileHeader'; // New component for mobile header

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
    // If there's no user, and not loading, onAuthStateChanged should handle redirection.
    // Returning null here prevents rendering children until redirection happens.
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <UISidebar>
        <AppSidebar />
      </UISidebar>
      <SidebarInset>
        <MobileHeader /> {/* Header for mobile view, contains trigger */}
        {/* Main content area with padding and max-width */}
        <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pt-20 md:pt-4 lg:pt-6"> {/* Added top padding for mobile header */}
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  // SidebarProvider from components/ui/sidebar handles its own state
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
