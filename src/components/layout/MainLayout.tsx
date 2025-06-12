
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
  Sidebar as UISidebar,
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
    // This case should ideally be handled by the redirect in useEffect,
    // but it's a fallback.
    return null;
  }

  // Forced desktop layout for debugging navbar visibility
  return (
    <div className="flex min-h-screen bg-background">
      <UISidebar> {/* This is the Sidebar component from ui/sidebar.tsx */}
        <AppSidebar />
      </UISidebar>
      <SidebarInset> {/* This is the SidebarInset component from ui/sidebar.tsx */}
        {/* This div wraps the actual page content */}
        <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  // Forced open and desktop context for debugging navbar visibility
  return (
    <SidebarProvider open={true} onOpenChange={() => {}}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
