// src/components/layout/AppSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, User, Bell, PlusSquare, LogOut, Settings, Users, Compass } from 'lucide-react'; // Added Compass
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image'; // Added Image for avatar

const navItems = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/explore', label: 'Explore', icon: Compass }, // Changed Users to Compass
  { href: '/create', label: 'Create Post', icon: PlusSquare },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === href;
    // For profile, ensure exact match or startsWith if profile has sub-routes
    if (href.includes('/profile/')) return pathname === href || pathname.startsWith(`${href}/`);
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0">
      <div className="flex h-16 items-center justify-start px-6 mt-2.5"> {/* Added mt-2.5 here */}
        <Logo iconSize={32} textSize="text-2xl" />
      </div>
      <Separator className="bg-sidebar-border my-2" /> {/* Added my-2 for spacing */}
      <nav className="flex-1 space-y-1 p-4"> {/* Reduced space-y from 2 to 1 */}
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            asChild
            className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium", // Changed text-base to text-sm
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
      <Separator className="bg-sidebar-border mb-2" /> {/* Added mb-2 */}
      <div className="p-4 space-y-1"> {/* Added space-y-1 */}
        {user && (
          <Button
            variant="ghost"
            asChild
            className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium", // Changed text-base to text-sm
              isActive(`/profile/${user.uid}`)
                ? "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active/90 hover:text-sidebar-active-foreground"
                : "hover:bg-sidebar-hover hover:text-sidebar-hover-foreground"
            )}
          >
            <Link href={`/profile/${user.uid}`}>
              <Avatar className="h-6 w-6"> {/* Adjusted avatar size */}
                {user.photoURL ? (
                  <Image src={user.photoURL} alt={user.displayName || 'User'} width={24} height={24} className="rounded-full" data-ai-hint="user avatar"/>
                ) : (
                  <AvatarFallback className="text-xs">{(user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              My Profile
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          asChild
           className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium", // Changed text-base to text-sm
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
          className="w-full justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-hover hover:text-sidebar-hover-foreground" // Changed text-base to text-sm
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
