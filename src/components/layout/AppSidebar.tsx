
// src/components/layout/AppSidebar.tsx
'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

// Simplified navItems for debugging
const navItems = [
  { href: '/', label: 'Test Feed Link', icon: Home, tooltip: 'Feed' },
];

export function AppSidebar() {
  // const pathname = usePathname(); // Not needed for this simplified version
  // const { user, logout } = useAuth(); // Not needed for this simplified version
  // const { isMobile, open: isDesktopExpanded } = useSidebar(); // 'open' is always true from context

  // Since sidebar is always expanded in this debug state, showLabels is always true
  const showLabels = true;

  return (
    <>
      <div className="p-3 h-16 flex items-center" style={{ color: "hsl(var(--sidebar-text-debug-color))" }}>
        <Logo iconSize={28} textSize="text-xl" className="gap-2 ml-1" />
      </div>
      <div className="border-t my-0" style={{ borderColor: "hsl(var(--sidebar-border))" }} />

      <div className="p-2 flex-1 overflow-y-auto" style={{ color: "hsl(var(--sidebar-text-debug-color))" }}>
        <div className="text-lg p-4">This is AppSidebar</div>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link 
                href={item.href}
                className="flex items-center gap-2.5 p-2.5 rounded-md text-sm hover:bg-[hsla(0,0%,100%,0.1)]"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {showLabels && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t my-0" style={{ borderColor: "hsl(var(--sidebar-border))" }} />
      <div className="p-2" style={{ color: "hsl(var(--sidebar-text-debug-color))" }}>
        <div className="p-2">Sidebar Footer Area (Debug)</div>
      </div>
    </>
  );
}
