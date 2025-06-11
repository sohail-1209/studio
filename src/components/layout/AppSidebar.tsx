// src/components/layout/AppSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Bell, PlusSquare, LogOut, Settings, Compass, PanelLeft } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import {
  useSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator as UISidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Feed', icon: Home, tooltip: 'Feed' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, tooltip: 'Messages' },
  { href: '/notifications', label: 'Notifications', icon: Bell, tooltip: 'Notifications' },
  { href: '/explore', label: 'Explore', icon: Compass, tooltip: 'Explore' },
  { href: '/create', label: 'Create Post', icon: PlusSquare, tooltip: 'Create Post' },
];


interface AppSidebarProps {
  /** True if this instance of AppSidebar is being rendered inside the mobile Sheet */
  isForMobileSheet?: boolean;
  /** True if this instance is for the mobile fixed icon strip */
  isForMobileIconStrip?: boolean;
}

export function AppSidebar({ isForMobileSheet = false, isForMobileIconStrip = false }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const {
    open: isDesktopExpanded, 
    isMobile,
    openMobile: isMobileSheetOpen, 
    toggleSidebar 
  } = useSidebar();

  const isActive = (href: string) => {
    if (href === '/') return pathname === href;
    if (href.includes('/profile/')) return pathname === href || pathname.startsWith(`${href}/`);
    return pathname.startsWith(href);
  };
  
  const showLabels = (!isMobile && isDesktopExpanded) || (isMobile && isForMobileSheet);
  const showTooltips = (!isMobile && !isDesktopExpanded) || (isMobile && isForMobileIconStrip);

  return (
    <>
      <SidebarHeader className="p-3">
        <div className="flex h-10 items-center justify-between">
          {showLabels ? (
            <Logo iconSize={28} textSize="text-xl" className="gap-2 ml-1" />
          ) : (
            <Link href="/" className="flex items-center justify-center w-full h-full">
              <Image
                src="https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png"
                alt="Synora Logo Icon"
                width={28}
                height={28}
                priority
                className="rounded-full"
              />
            </Link>
          )}
          {(!isMobile || isForMobileIconStrip) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebar} 
            >
              <PanelLeft />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}
        </div>
      </SidebarHeader>
      <UISidebarSeparator className="my-0 bg-sidebar-border/50" />

      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const isButtonPureTrigger = isMobile && isForMobileIconStrip;
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild={!isButtonPureTrigger}
                  size="default"
                  isActive={!isButtonPureTrigger && isActive(item.href)} 
                  tooltip={showTooltips ? { content: item.tooltip, side: "right", align: "center", className: "ml-1" } : undefined}
                  className="justify-start h-9 px-2.5 text-sm"
                  onClick={isButtonPureTrigger ? () => { if (!isMobileSheetOpen) toggleSidebar(); } : undefined}
                >
                  {isButtonPureTrigger ? (
                    <>
                      <item.icon className="h-5 w-5 shrink-0" />
                    </>
                  ) : (
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {showLabels && <span className="truncate">{item.label}</span>}
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <UISidebarSeparator className="my-0 bg-sidebar-border/50" />
      <SidebarFooter className="p-2 space-y-1">
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild={!(isMobile && isForMobileIconStrip)}
                size="default"
                isActive={!(isMobile && isForMobileIconStrip) && isActive(`/profile/${user.uid}`)}
                tooltip={showTooltips ? { content: "My Profile", side: "right", align: "center", className: "ml-1" } : undefined}
                className="justify-start h-9 px-2.5 text-sm"
                onClick={(isMobile && isForMobileIconStrip) ? () => { if (!isMobileSheetOpen) toggleSidebar(); } : undefined}
              >
                 {(isMobile && isForMobileIconStrip) ? (
                    <Avatar className="h-6 w-6 shrink-0">
                      {user.photoURL ? <Image src={user.photoURL} alt={user.displayName || 'User'} width={24} height={24} className="rounded-full" data-ai-hint="user avatar"/> : <AvatarFallback className="text-xs">{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>}
                    </Avatar>
                 ) : (
                    <Link href={`/profile/${user.uid}`}>
                      <Avatar className="h-6 w-6 shrink-0">
                         {user.photoURL ? <Image src={user.photoURL} alt={user.displayName || 'User'} width={24} height={24} className="rounded-full" data-ai-hint="user avatar"/> : <AvatarFallback className="text-xs">{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>}
                      </Avatar>
                      {showLabels && <span className="truncate">My Profile</span>}
                    </Link>
                 )}
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild={!(isMobile && isForMobileIconStrip)}
                size="default"
                isActive={!(isMobile && isForMobileIconStrip) && isActive('/settings')}
                tooltip={showTooltips ? { content: "Settings", side: "right", align: "center", className: "ml-1" } : undefined}
                className="justify-start h-9 px-2.5 text-sm"
                onClick={(isMobile && isForMobileIconStrip) ? () => { if (!isMobileSheetOpen) toggleSidebar(); } : undefined}
              >
                {(isMobile && isForMobileIconStrip) ? (
                    <Settings className="h-5 w-5 shrink-0" />
                ) : (
                  <Link href="/settings">
                    <Settings className="h-5 w-5 shrink-0" />
                    {showLabels && <span className="truncate">Settings</span>}
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild={false} 
                size="default"
                onClick={() => {
                  if (isMobile && isForMobileIconStrip) {
                    if (!isMobileSheetOpen) toggleSidebar();
                  } else {
                    logout(); 
                  }
                }}
                tooltip={showTooltips ? { content: "Logout", side: "right", align: "center", className: "ml-1" } : undefined}
                className="justify-start h-9 px-2.5 text-sm w-full"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {showLabels && <span className="truncate">Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </>
  );
}
