
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
  Sidebar,
  SidebarInset,
  useSidebar,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { cn } from '@/lib/utils';

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
          <Sheet open={openMobile} onOpenChange={setOpenMobile}>
            <SheetContent side="left" className="w-[var(--sidebar-width-mobile)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
               <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <AppSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 shadow-sm backdrop-blur-sm sm:px-6">
              <SidebarTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SidebarTrigger>
              <div className="ml-auto"> {/* Pushes Logo to the right if no other items */}
                <Logo iconSize={24} textSize="text-lg" />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto">
              <div className={cn(
                "w-full",
                "px-4 py-4 sm:px-6", // Mobile and small tablet padding
                "md:px-6 lg:px-8" // Desktop padding (adjusted for consistency with max-width approach)
              )}>
                {children}
              </div>
            </main>
          </div>
        </>
      ) : (
        <>
          <Sidebar
            collapsible="icon"
            variant="sidebar"
            side="left"
            className="border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md"
          >
            <AppSidebar />
          </Sidebar>
          <SidebarInset>
            <main className="flex-1 overflow-y-auto">
               <div className={cn(
                "w-full",
                "p-4", // Base padding
                "md:p-6", // Medium screen padding
                "lg:max-w-7xl lg:mx-auto" // Large screen constraints
              )}>
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
