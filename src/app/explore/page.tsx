
// src/app/explore/page.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore - NExCHAT',
  description: 'Discover new content and users.',
};

export default function ExplorePage() {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Compass className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Explore</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <Compass className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold text-foreground">Discover Something New</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The explore page is under construction. Check back soon for exciting content!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
