
// src/app/explore/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, Image as ImageIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, Timestamp, getDocs } from 'firebase/firestore';
import type { Post } from '@/types/post';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Metadata should be defined at the top level for server components,
// or handled dynamically for client components if needed.
// For now, let's keep it static as this page's core purpose is fixed.
// export const metadata: Metadata = { // Static metadata is better in layout or page if possible
//   title: 'Explore - NExCHAT',
//   description: 'Discover new content and users on NExCHAT.',
// };


export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExplorePosts = async () => {
      setLoading(true);
      try {
        const postsColRef = collection(db, 'posts');
        const q = query(
          postsColRef,
          where('isStory', '!=', true), // Exclude stories
          orderBy('createdAt', 'desc'),
          limit(24) // Fetch up to 24 recent non-story posts
        );

        const querySnapshot = await getDocs(q);
        const fetchedPosts = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as Post;
          })
          .filter(post => post.imageUrl); // Only include posts that have an image for the explore grid

        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching explore posts:", error);
        // Optionally, show a toast message to the user
      } finally {
        setLoading(false);
      }
    };

    fetchExplorePosts();
  }, []);

  const PostGridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
      {[...Array(12)].map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-md" />
      ))}
    </div>
  );

  return (
    <MainLayout>
      <div className="container mx-auto max-w-5xl py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Compass className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Explore</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <PostGridSkeleton />}
            {!loading && posts.length === 0 && (
              <div className="py-12 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold text-foreground">Nothing to explore yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check back later for new and exciting content from other users!
                </p>
              </div>
            )}
            {!loading && posts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2">
                {posts.map((post) => (
                  <Link href={`/profile/${post.userId}`} key={post.id} className="group relative aspect-square block w-full overflow-hidden rounded-md">
                    {post.imageUrl ? (
                      <Image
                        src={post.imageUrl}
                        alt={post.caption || 'Explore post'}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        style={{objectFit: 'cover'}}
                        className="transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint={post.dataAiHint || "photo landscape"}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 flex flex-col justify-end">
                        <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={post.userAvatarUrl || undefined} alt={post.userDisplayName || 'User'} data-ai-hint="user avatar" />
                                <AvatarFallback>{(post.userDisplayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium text-white truncate">
                                {post.userDisplayName || 'Anonymous'}
                            </p>
                        </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
