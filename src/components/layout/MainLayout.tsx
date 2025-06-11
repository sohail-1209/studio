
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
  Sidebar, // shadcn/ui Sidebar for desktop
  SidebarInset, // For desktop content margin
  useSidebar, // To get isMobile, openMobile, setOpenMobile
} from '@/components/ui/sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet'; // shadcn/ui Sheet for mobile

interface MainLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
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
    <div className="flex min-h-screen bg-background">
      {isMobile ? (
        <>
          {/* Mobile: Persistent Icon Strip */}
          <div className="fixed inset-y-0 left-0 z-20 flex h-full w-[var(--sidebar-width-icon)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <AppSidebar isForMobileIconStrip={true} />
          </div>
          {/* Mobile: Sheet for full sidebar, triggered from AppSidebar in icon strip mode */}
          <Sheet open={openMobile} onOpenChange={setOpenMobile}>
            <SheetContent side="left" className="w-[var(--sidebar-width-mobile)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
              <AppSidebar isForMobileSheet={true} />
            </SheetContent>
          </Sheet>
          {/* Mobile: Main Content Area, offset by the icon strip */}
          <main className="flex-1 overflow-y-auto" style={{ marginLeft: 'var(--sidebar-width-icon)' }}>
            <div className="mx-auto max-w-md p-4"> {/* Content narrower and centered on mobile */}
              {children}
            </div>
          </main>
        </>
      ) : (
        <>
          {/* Desktop: Collapsible Sidebar using shadcn/ui <Sidebar> */}
          <Sidebar
            collapsible="icon"
            variant="sidebar"
            side="left"
            className="border-sidebar-border bg-sidebar text-sidebar-foreground"
          >
            <AppSidebar /> {/* Renders standard desktop sidebar */}
          </Sidebar>
          {/* Desktop: Main Content Area with Inset for auto margin adjustments */}
          <SidebarInset>
            <main className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6"> {/* Padding applied to inner div */}
                {children}
              </div>
            </main>
          </SidebarInset>
        </>
      )}
    </div>
  );
}


export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}

