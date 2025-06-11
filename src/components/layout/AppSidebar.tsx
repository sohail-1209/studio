// src/components/layout/AppSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, User, Bell, PlusSquare, LogOut, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/explore', label: 'Explore', icon: Users }, // Example: could be discover page
  { href: '/create', label: 'Create Post', icon: PlusSquare },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0">
      <div className="flex h-16 items-center justify-start px-6">
        <Logo />
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            asChild
            className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2 text-base font-medium",
              isActive(item.href)
                ? "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active/90 hover:text-sidebar-active-foreground"
                : "hover:bg-sidebar-hover hover:text-sidebar-hover-foreground"
            )}
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="p-4">
        {user && (
          <Button
            variant="ghost"
            asChild
            className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2 text-base font-medium",
              isActive(`/profile/${user.uid}`)
                ? "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active/90 hover:text-sidebar-active-foreground"
                : "hover:bg-sidebar-hover hover:text-sidebar-hover-foreground"
            )}
          >
            <Link href={`/profile/${user.uid}`}>
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              My Profile
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          asChild
           className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2 text-base font-medium",
              isActive(`/settings`)
                ? "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active/90 hover:text-sidebar-active-foreground"
                : "hover:bg-sidebar-hover hover:text-sidebar-hover-foreground"
            )}
        >
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </Button>
        <Button
          variant="ghost"
          onClick={logout}
          className="mt-2 w-full justify-start gap-3 rounded-md px-3 py-2 text-base font-medium hover:bg-sidebar-hover hover:text-sidebar-hover-foreground"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
