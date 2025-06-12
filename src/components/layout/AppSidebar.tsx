
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
  const showLabels = true; // Sidebar is always expanded in this debug state

  return (
    <>
      <div className="p-3 h-16 flex items-center text-white">
        <Logo iconSize={28} textSize="text-xl" className="gap-2 ml-1 !text-white" />
      </div>
      <div className="border-t my-0 border-white/30" />

      <div className="p-2 flex-1 overflow-y-auto text-white">
        <div className="text-lg p-4">AppSidebar (RED)</div>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link 
                href={item.href}
                className="flex items-center gap-2.5 p-2.5 rounded-md text-sm hover:bg-white/20"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {showLabels && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t my-0 border-white/30" />
      <div className="p-2 text-white">
        <div className="p-2">Sidebar Footer (RED)</div>
      </div>
    </>
  );
}

    