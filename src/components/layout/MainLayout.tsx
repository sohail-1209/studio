
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
  // useSidebar, // Temporarily remove useSidebar for forced desktop
  // SidebarTrigger, // Not needed for forced desktop
} from '@/components/ui/sidebar';
// Mobile-specific imports are commented out for this debugging step
// import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
// import { Button } from '@/components/ui/button';
// import { PanelLeft } from 'lucide-react';
// import { Logo } from '@/components/shared/Logo';
// import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: MainLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // const { isMobile, openMobile, setOpenMobile } = useSidebar(); // Temporarily removed

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
    // This typically won't be shown due to the redirect, but good for safety.
    return null;
  }

  // FORCED DESKTOP LAYOUT FOR DEBUGGING
  // This structure will be attempted on all screen sizes.
  // The UISidebar component itself has `hidden md:flex` so it should only show on medium screens and up.
  return (
    <div className="flex min-h-screen bg-background"> {/* Root flex container for desktop */}
      <UISidebar> {/* Desktop sidebar component from ui/sidebar.tsx */}
        <AppSidebar /> {/* Actual navigation links and user profile section */}
      </UISidebar>
      <SidebarInset> {/* Main content wrapper from ui/sidebar.tsx, takes remaining space */}
        {/* Inner wrapper for consistent padding and max-width of the content itself */}
        <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </div>
  );
}


export function MainLayout({ children }: MainLayoutProps) {
  return (
    // Force SidebarProvider to think it's always open for desktop for this test
    // The 'open' state in SidebarContext will be true.
    <SidebarProvider defaultOpen={true}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

