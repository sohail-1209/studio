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
import { Button } from '@/components/ui/button'; // For the desktop toggle

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
  const { state, isMobile, toggleSidebar } = useSidebar();

  const isActive = (href: string) => {
    if (href === '/') return pathname === href;
    if (href.includes('/profile/')) return pathname === href || pathname.startsWith(`${href}/`);
    return pathname.startsWith(href);
  };

  const showLabels = state === 'expanded' || isMobile;

  return (
    <>
      <SidebarHeader className="p-3"> {/* Adjusted padding */}
        <div className="flex h-10 items-center justify-between"> {/* Fixed height for header content */}
          {showLabels ? (
            <Logo iconSize={30} textSize="text-2xl" className="gap-2 ml-1" />
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden md:flex group-data-[collapsible=icon]:hidden" // Only show on desktop if sidebar is not in permanent icon-only mode by prop
            onClick={toggleSidebar}
          >
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </SidebarHeader>
      <UISidebarSeparator className="my-0 bg-sidebar-border/50" />

      <SidebarContent className="p-2"> {/* Adjusted padding */}
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                size="default"
                isActive={isActive(item.href)}
                tooltip={{content: item.tooltip, side: "right", align:"center", className: "ml-1"}}
                className="justify-start h-9 px-2.5 text-sm" // Consistent item size
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  {showLabels && <span className="truncate">{item.label}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
                tooltip={{content: "My Profile", side: "right", align:"center", className: "ml-1"}}
                className="justify-start h-9 px-2.5 text-sm" // Consistent item size
              >
                <Link href={`/profile/${user.uid}`}>
                  <Avatar className="h-6 w-6 shrink-0">
                    {user.photoURL ? (
                      <Image src={user.photoURL} alt={user.displayName || 'User'} width={24} height={24} className="rounded-full" data-ai-hint="user avatar"/>
                    ) : (
                      <AvatarFallback className="text-xs">{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    )}
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
                tooltip={{content: "Settings", side: "right", align:"center", className: "ml-1"}}
                className="justify-start h-9 px-2.5 text-sm" // Consistent item size
              >
                <Link href="/settings">
                  <Settings className="h-5 w-5 shrink-0" />
                  {showLabels && <span className="truncate">Settings</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                size="default"
                onClick={logout} 
                tooltip={{content: "Logout", side: "right", align:"center", className: "ml-1"}}
                className="justify-start h-9 px-2.5 text-sm w-full" // Consistent item size
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
