
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
    <div className="flex min-h-screen">
      <UISidebar> 
        <AppSidebar />
      </UISidebar>
      <SidebarInset> 
        {/* This div wraps the actual page content and gets the blue debug background */}
        <div
          className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8"
          // The !bg-blue-500 is now applied in SidebarInset directly
        >
          {children}
        </div>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider open={true} onOpenChange={() => { /* no-op for fixed sidebar */ }}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

    