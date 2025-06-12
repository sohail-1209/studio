
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
// Mobile-specific imports are removed for this forced desktop layout
// import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
// import { Button } from '@/components/ui/button';
// import { PanelLeft } from 'lucide-react';
// import { Logo } from '@/components/shared/Logo';

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
    return null; // Should be redirected
  }

  // FORCED DESKTOP LAYOUT
  return (
    <div className="flex min-h-screen bg-background">
      <UISidebar> {/* This is the Sidebar component from ui/sidebar.tsx */}
        <AppSidebar />
      </UISidebar>
      <SidebarInset> {/* This is the SidebarInset component from ui/sidebar.tsx */}
        {/* Inner wrapper for consistent padding of the content itself */}
        {/* Removing max-w-7xl and mx-auto for initial simplicity */}
        <main className="w-full flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  // Force 'open' to true and provide a no-op for onOpenChange
  // as we are not implementing collapse/expand functionality in this simplified version.
  return (
    <SidebarProvider open={true} onOpenChange={() => {}}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
