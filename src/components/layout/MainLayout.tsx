
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
  Sidebar as DesktopSidebar, // Renamed to avoid conflict and clarify usage
  MobileSheetSidebar,      // Import the new MobileSheetSidebar
  SidebarInset,
} from '@/components/ui/sidebar';
import { MobileHeader } from './MobileHeader'; 
import { cn } from '@/lib/utils'; // Import cn

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
      <DesktopSidebar> {/* This is the sidebar for md screens and up */}
        <AppSidebar />
      </DesktopSidebar>
      
      <MobileSheetSidebar> {/* This handles the sheet for sm screens */}
        <AppSidebar />
      </MobileSheetSidebar>

      <SidebarInset className="overflow-y-scroll">
        <MobileHeader /> 
        <main className={cn(
          "w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pt-18 md:pt-4 lg:pt-6", // Changed pt-20 to pt-18
          "min-w-0 overflow-x-hidden" 
        )}> 
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider> {/* initialDesktopCollapsed can be set here if needed */}
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

