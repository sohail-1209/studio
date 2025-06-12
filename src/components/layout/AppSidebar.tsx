
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
} from '@/components/ui/sidebar';
import {
  Home,
  Compass,
  MessageSquare,
  Bell,
  UserCircle,
  Settings,
  LogOut,
  PlusCircle,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function AppSidebar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    // Initialize theme based on localStorage
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme) {
      setCurrentTheme(storedTheme);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', storedTheme === 'dark');
      }
    } else if (systemPrefersDark) {
      setCurrentTheme('dark');
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('dark');
      }
    } else {
      setCurrentTheme('light');
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
    }

    // Listener for system theme changes
    let mediaQuery: MediaQueryList | undefined;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
          if (!localStorage.getItem('theme')) { // Only if no theme is manually set
            const newSystemTheme = e.matches ? 'dark' : 'light';
            setCurrentTheme(newSystemTheme);
            if (typeof document !== 'undefined') {
              document.documentElement.classList.toggle('dark', newSystemTheme === 'dark');
            }
          }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery?.removeEventListener('change', handleChange);
    }

  }, []);


  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
    // Potentially add a toast notification here if desired
  };

  const navItems = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/create', label: 'Create', icon: PlusCircle, mobileOnly: true, className: "md:hidden" },
    { href: `/profile/${user?.uid || ''}`, label: 'Profile', icon: UserCircle, requiresAuth: true },
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground p-2">
        <SidebarHeader className="p-1 mb-1">
          <Logo className="!text-white" iconSize={30} textSize="text-2xl" />
        </SidebarHeader>
        <SidebarSeparator className="!bg-white/20 my-1" />
        <SidebarContent className="flex-1">
          <SidebarMenu>
            {[...Array(5)].map((_, i) => (
              <SidebarMenuSkeleton key={`skel-${i}`} showIcon />
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator className="!bg-white/20 my-1" />
        <SidebarFooter className="p-1">
          <SidebarMenuSkeleton showIcon />
        </SidebarFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground p-2">
      <SidebarHeader className="p-1 mb-1">
         <Logo className="!text-white" iconSize={30} textSize="text-2xl" />
      </SidebarHeader>
      <SidebarSeparator className="!bg-white/20 my-1" />

      <SidebarContent className="flex-1">
        <SidebarMenu>
          {navItems.filter(item => {
            if (item.requiresAuth && !user) return false;
            if (item.mobileOnly && typeof window !== 'undefined' && window.innerWidth >= 768) return false; 
            return true;
          }).map((item) => {
            const href = item.label === 'Profile' && user ? `/profile/${user.uid}` : item.href;
            const isActive = pathname === href || (item.label === 'Profile' && user && pathname.startsWith(`/profile/${user.uid}`));
            
            if (item.label === 'Profile' && !user) return null;

            return (
              <SidebarMenuItem key={item.label} className={item.className}>
                <Link href={href} passHref>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className="!text-white hover:!bg-white/20 data-[active=true]:!bg-white/30 data-[active=true]:font-semibold"
                  >
                    <span className="flex items-center gap-2.5 w-full"> {/* Ensure full width and consistent gap */}
                      <item.icon />
                      <span>{item.label}</span>
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator className="!bg-white/20 my-1" />
      <SidebarFooter className="p-1 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton onClick={toggleTheme} className="!text-white hover:!bg-white/20 w-full">
                {currentTheme === 'light' ? <Moon /> : <Sun />}
                <span>Switch to {currentTheme === 'light' ? 'Dark' : 'Light'}</span>
              </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/settings" passHref>
              <SidebarMenuButton asChild isActive={pathname === '/settings'} className="!text-white hover:!bg-white/20 data-[active=true]:!bg-white/30 data-[active=true]:font-semibold">
                <span className="flex items-center gap-2.5 w-full">
                  <Settings /><span>Settings</span>
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {user && (
              <SidebarMenuItem>
                <Link href={`/profile/${user.uid}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/20 cursor-pointer w-full">
                  <Avatar className="h-8 w-8">
                    {user.photoURL ? (
                      <Image src={user.photoURL} alt={user.displayName || 'User'} width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
                    ) : (
                      <AvatarFallback className="bg-white/30 text-white">{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="text-xs !text-white overflow-hidden">
                    <p className="font-semibold truncate">{user.displayName || 'User'}</p>
                    {user.username && <p className="text-white/70 truncate">@{user.username}</p>}
                  </div>
                </Link>
            </SidebarMenuItem>
          )}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} className="w-full !text-white hover:!bg-red-700/50 hover:!text-white">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </div>
  );
}
