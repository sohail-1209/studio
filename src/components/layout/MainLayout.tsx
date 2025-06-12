
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
    // This typically won't be shown due to the redirect, but good for safety.
    return null;
  }

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 shadow-sm backdrop-blur-sm sm:px-6">
          <SidebarTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SidebarTrigger>
          <div className="ml-auto">
            <Logo iconSize={24} textSize="text-lg" />
          </div>
        </header>
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="w-[var(--sidebar-width-mobile)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <AppSidebar />
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 sm:px-6 w-full">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar> {/* This is the actual desktop sidebar UI element */}
        <AppSidebar /> {/* The content of the sidebar */}
      </Sidebar>
      <SidebarInset> {/* This is the main content area wrapper */}
        <main className="flex-1 overflow-y-auto"> {/* Added main tag for semantics */}
          <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8"> {/* Content padding and max-width */}
            {children}
          </div>
        </main>
      </SidebarInset>
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
