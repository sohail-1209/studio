
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


export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const {
    open: isDesktopExpanded,
    isMobile,
    toggleSidebar
  } = useSidebar();

  const isActive = (href: string) => {
    if (href === '/') return pathname === href;
    if (href.includes('/profile/')) return pathname === href || pathname.startsWith(`${href}/`);
    return pathname.startsWith(href);
  };

  // Labels are shown if: on desktop and expanded OR if it's the mobile sheet content.
  const showLabels = (!isMobile && isDesktopExpanded) || isMobile;
  // Tooltips are shown if: on desktop and collapsed.
  const showTooltips = !isMobile && !isDesktopExpanded;

  return (
    <>
      <SidebarHeader className="p-3">
        <div className="flex h-10 items-center justify-between">
          {showLabels ? ( // Show full logo if labels are shown (desktop expanded or mobile sheet)
            <Logo iconSize={28} textSize="text-xl" className="gap-2 ml-1" />
          ) : ( // Otherwise, show icon-only logo (for desktop collapsed)
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
          {/* Toggle button for desktop sidebar collapse/expand. Hidden on mobile as sheet has its own trigger. */}
          {!isMobile && (
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
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  size="default"
                  isActive={isActive(item.href)}
                  tooltip={showTooltips ? { content: item.tooltip, side: "right", align: "center", className: "ml-1" } : undefined}
                  className="justify-start h-9 px-2.5 text-sm"
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5 shrink-0" />
                    {showLabels && <span className="truncate">{item.label}</span>}
                  </Link>
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
                asChild
                size="default"
                isActive={isActive(`/profile/${user.uid}`)}
                tooltip={showTooltips ? { content: "My Profile", side: "right", align: "center", className: "ml-1" } : undefined}
                className="justify-start h-9 px-2.5 text-sm"
              >
                <Link href={`/profile/${user.uid}`}>
                  <Avatar className="h-6 w-6 shrink-0">
                      {user.photoURL ? <Image src={user.photoURL} alt={user.displayName || 'User'} width={24} height={24} className="rounded-full" data-ai-hint="user avatar"/> : <AvatarFallback className="text-xs">{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>}
                  </Avatar>
                  {showLabels && <span className="truncate">My Profile</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="default"
                isActive={isActive('/settings')}
                tooltip={showTooltips ? { content: "Settings", side: "right", align: "center", className: "ml-1" } : undefined}
                className="justify-start h-9 px-2.5 text-sm"
              >
                <Link href="/settings">
                  <Settings className="h-5 w-5 shrink-0" />
                  {showLabels && <span className="truncate">Settings</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild={false}
                size="default"
                onClick={() => {
                   logout();
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
