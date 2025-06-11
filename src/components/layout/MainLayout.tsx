
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
  SidebarTrigger, // Import SidebarTrigger
} from '@/components/ui/sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet'; // shadcn/ui Sheet for mobile
import { Button } from '@/components/ui/button'; // For the trigger button
import { PanelLeft } from 'lucide-react'; // For the trigger icon
import { Logo } from '@/components/shared/Logo'; // For mobile header

interface MainLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isMobile, openMobile, setOpenMobile, toggleSidebar } = useSidebar();

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
          {/* Mobile: Sheet for full sidebar, triggered from AppSidebar in icon strip mode */}
          <Sheet open={openMobile} onOpenChange={setOpenMobile}>
            <SheetContent side="left" className="w-[var(--sidebar-width-mobile)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
              <AppSidebar isForMobileSheet={true} />
            </SheetContent>
          </Sheet>
          
          {/* Mobile: Main Content Area */}
          <div className="flex flex-1 flex-col">
            {/* Mobile Header */}
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6 md:hidden">
              <SidebarTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SidebarTrigger>
              <div className="ml-auto">
                <Logo iconSize={24} textSize="text-lg" />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto">
              <div className="p-4">
                {children}
              </div>
            </main>
          </div>
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

