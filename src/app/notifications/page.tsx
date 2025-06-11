
// src/app/notifications/page.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications - NExCHAT',
  description: 'View your notifications.',
};

export default function NotificationsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold text-foreground">No new notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;re all caught up! We&apos;ll let you know when there&apos;s something new.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
