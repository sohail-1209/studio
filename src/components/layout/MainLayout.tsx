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
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

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
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback, prevent rendering children.
    return null; 
  }

  return (
    <SidebarProvider defaultOpen={true}> {/* Default to open on desktop */}
      <div className="flex min-h-screen bg-background">
        <Sidebar 
          collapsible="icon" 
          variant="sidebar" 
          side="left" 
          className="border-sidebar-border bg-sidebar text-sidebar-foreground"
        >
          <AppSidebar />
        </Sidebar>
        <SidebarInset>
          {/* Mobile Header with Toggle */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 md:hidden">
            <SidebarTrigger asChild>
              <Button size="icon" variant="outline" className="h-9 w-9">
                <PanelLeft />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SidebarTrigger>
            {/* Mobile Logo */}
            <Logo iconSize={28} textSize="text-xl" />
            <div className="w-9"></div> {/* Spacer for balance */}
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6"> {/* Adjusted padding */}
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
