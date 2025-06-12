
// src/components/layout/MobileHeader.tsx
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button'; // SidebarTrigger is essentially a Button
import { PanelLeft } from 'lucide-react';

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex items-center">
        <SidebarTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2 -ml-2">
            <PanelLeft className="h-6 w-6" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </SidebarTrigger>
      </div>
      <div className="flex items-center">
        <Logo iconSize={28} textSize="text-xl" />
      </div>
      <div className="w-10"> {/* Spacer to balance the trigger button */}
      </div>
    </header>
  );
}
