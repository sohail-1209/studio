
// src/app/create/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Spinner } from '@/components/shared/Spinner';

// This page will redirect to the feed, as post creation is handled by a dialog there.
export default function CreateRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/'); // Redirect to the feed page
  }, [router]);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col items-center justify-center">
        <Spinner size={48} />
        <p className="mt-4 text-muted-foreground">Redirecting to create post...</p>
      </div>
    </MainLayout>
  );
}
