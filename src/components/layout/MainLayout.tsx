
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
import { Sheet, SheetContent } from '@/components/ui/sheet'; 
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
              <AppSidebar isForMobileSheet={true} />
            </SheetContent>
          </Sheet>
          
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
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
              {/* Apply padding and max-width constraints here for mobile and desktop */}
              <div className="w-full p-4 md:max-w-7xl md:mx-auto md:p-6">
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
            className="border-sidebar-border bg-sidebar text-sidebar-foreground"
          >
            <AppSidebar /> 
          </Sidebar>
          <SidebarInset>
            <main className="flex-1 overflow-y-auto">
               {/* Apply padding and max-width constraints here for desktop */}
              <div className="w-full p-4 md:max-w-7xl md:mx-auto md:p-6">
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
