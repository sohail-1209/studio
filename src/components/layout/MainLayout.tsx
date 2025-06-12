
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
  Sidebar as UISidebar, // Renaming to avoid conflict with semantic HTML5 aside
  SidebarInset,
} from '@/components/ui/sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

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
    return null; // Should be redirected by useEffect
  }

  // FORCED DESKTOP LAYOUT - SidebarProvider is configured to keep sidebar open & expanded
  return (
    <div className="flex min-h-screen bg-background">
      {/* UISidebar is the <aside> from src/components/ui/sidebar.tsx */}
      <UISidebar> 
        <AppSidebar />
      </UISidebar>
      
      {/* SidebarInset is the flex-1 content area from src/components/ui/sidebar.tsx */}
      <SidebarInset> 
        <main className="w-full flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  // Force 'open' to true and onOpenChange to a no-op.
  // The SidebarProvider is simplified to always reflect an "open" and "desktop" state.
  return (
    <SidebarProvider open={true} onOpenChange={() => {}}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
