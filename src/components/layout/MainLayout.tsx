
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
      <UISidebar> {/* Removed inline style and className prop */}
        <AppSidebar />
      </UISidebar>
      <SidebarInset>
        {/* The direct child of SidebarInset gets the padding and max-width for content */}
        <div
          className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8"
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
