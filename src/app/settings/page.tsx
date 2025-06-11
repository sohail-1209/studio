
// src/app/settings/page.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsIcon } from 'lucide-react'; // Changed from 'Settings' to 'SettingsIcon' as lucide-react typically uses 'Icon' suffix
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - NExCHAT',
  description: 'Manage your account settings.',
};

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold text-foreground">Account Settings</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This page is under construction. You&apos;ll soon be able to manage your preferences here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
