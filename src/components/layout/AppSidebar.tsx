
// src/components/layout/AppSidebar.tsx
'use client';

import { Logo } from '@/components/shared/Logo';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Home,
  Compass,
  MessageSquare,
  Bell,
  UserCircle,
  Settings,
  LogOut,
  Moon,
  Sun,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { user, logout, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [currentTheme, setCurrentTheme] = useState('light');
  const { isDesktopCollapsed, isMobileSheetOpen, setIsMobileSheetOpen } = useSidebar();

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme) {
      setCurrentTheme(storedTheme);
    } else if (systemPrefersDark) {
      setCurrentTheme('dark');
    } else {
      setCurrentTheme('light');
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', currentTheme === 'dark');
      localStorage.setItem('theme', currentTheme);
    }
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const navItems = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: `/profile/${user?.uid || ''}`, label: 'Profile', icon: UserCircle, requiresAuth: true },
  ];

  const showText = !isDesktopCollapsed || isMobileSheetOpen;

  if (authLoading && !isMobileSheetOpen) {
    return (
      <div className={cn("flex flex-col h-full p-2", isMobileSheetOpen && "pt-8")}>
        <SidebarHeader className="p-1 mb-1 flex items-center justify-between">
          <Logo iconSize={30} textSize="text-2xl" className={cn(isDesktopCollapsed && !isMobileSheetOpen ? "hidden" : "flex")} />
          {!isMobileSheetOpen && <SidebarTrigger><MoreVertical /></SidebarTrigger>}
        </SidebarHeader>
        <SidebarSeparator className="my-1" />
        <SidebarContent className="flex-1">
          <SidebarMenu>
            {[...Array(5)].map((_, i) => (
              <SidebarMenuSkeleton key={`skel-${i}`} showIcon={showText} />
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator className="my-1" />
        <SidebarFooter className="p-1">
          <SidebarMenuSkeleton showIcon={showText} />
        </SidebarFooter>
      </div>
    );
  }


  return (
    <div className={cn("flex flex-col h-full p-2", isMobileSheetOpen && "pt-8")}>
      <SidebarHeader className={cn("p-1 mb-1 flex items-center", showText ? "justify-between" : "justify-center")}>
         <Logo iconSize={30} textSize="text-3xl" className={cn(!showText ? "hidden" : "flex")} />
         {!showText && <Logo iconSize={30} className="!gap-0" />}
         {!isMobileSheetOpen && <SidebarTrigger><MoreVertical /></SidebarTrigger>}
      </SidebarHeader>
      <SidebarSeparator className="my-1" />

      <SidebarContent className="flex-1">
        <SidebarMenu>
          {navItems.filter(item => !(item.requiresAuth && !user)).map((item) => {
            const href = item.label === 'Profile' && user ? `/profile/${user.uid}` : item.href;
            const isActive = pathname === href || (item.label === 'Profile' && user && pathname.startsWith(`/profile/${user.uid}`));

            if (item.label === 'Profile' && !user) return null;

            return (
              <SidebarMenuItem key={item.label}>
                <Link href={href} onClick={() => { if (isMobileSheetOpen) setIsMobileSheetOpen(false); }}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={!showText ? item.label : undefined}
                    className={cn(!showText && "justify-center")}
                  >
                    <item.icon />
                    {showText && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator className="my-1" />
      <SidebarFooter className="p-1 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton onClick={toggleTheme} className={cn("w-full", !showText && "justify-center")} tooltip={!showText ? (currentTheme === 'light' ? 'Switch to Dark' : 'Switch to Light') : undefined}>
                {currentTheme === 'light' ? <Moon /> : <Sun />}
                {showText && <span>Switch to {currentTheme === 'light' ? 'Dark' : 'Light'}</span>}
              </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/settings">
              <SidebarMenuButton isActive={pathname === '/settings'} className={cn(!showText && "justify-center")} tooltip={!showText ? "Settings" : undefined} onClick={() => { if (isMobileSheetOpen) setIsMobileSheetOpen(false); }}>
                <Settings />
                {showText && <span>Settings</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {user && showText && (
            <SidebarMenuItem>
              <Link href={`/profile/${user.uid}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-sidebar-hover cursor-pointer w-full text-sidebar-foreground hover:text-sidebar-hover-foreground" onClick={() => { if (isMobileSheetOpen) setIsMobileSheetOpen(false); }}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback>{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-xs overflow-hidden">
                  <p className="font-semibold truncate">{user.displayName || 'User'}</p>
                  {user.username && <p className="text-sidebar-foreground/70 truncate">@{user.username}</p>}
                </div>
              </Link>
            </SidebarMenuItem>
          )}
          {user && !showText && (
            <SidebarMenuItem>
               <Link href={`/profile/${user.uid}`} onClick={() => { if (isMobileSheetOpen) setIsMobileSheetOpen(false); }}>
                <SidebarMenuButton className={cn("justify-center h-auto py-1.5")} tooltip="Profile">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback>{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} className={cn("w-full hover:!bg-destructive/10 hover:!text-destructive", !showText && "justify-center")} tooltip={!showText ? "Logout" : undefined}>
                <LogOut />
                {showText && <span>Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </div>
  );
}
