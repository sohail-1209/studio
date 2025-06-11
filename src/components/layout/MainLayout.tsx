// src/components/layout/MainLayout.tsx
'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/shared/Spinner';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size={48} />
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback, prevent rendering children.
    return null; 
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-6 md:ml-64"> {/* Adjust margin to account for sidebar width */}
        {children}
      </main>
    </div>
  );
}
