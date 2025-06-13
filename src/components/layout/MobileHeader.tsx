
// src/components/layout/MobileHeader.tsx
'use client';

import { useSidebar } from '@/components/ui/sidebar'; // Import useSidebar
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button'; 
import { MoreVertical } from 'lucide-react'; // Changed from PanelLeft to MoreVertical

export function MobileHeader() {
  const { setIsMobileSheetOpen } = useSidebar(); // Get setter for mobile sheet

  return (
    <header className="md:hidden sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex items-center">
        {/* This Button now acts as the SheetTrigger for mobile */}
        <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 -ml-2" 
            onClick={() => setIsMobileSheetOpen(true)}
            aria-label="Open sidebar"
        >
          <MoreVertical className="h-6 w-6" /> {/* Changed icon here */}
          <span className="sr-only">Open Sidebar</span>
        </Button>
      </div>
      <div className="flex items-center">
        <Logo iconSize={28} textSize="text-xl" />
      </div>
      <div className="w-10"> {/* Spacer to balance the trigger button */}
      </div>
    </header>
  );
}
