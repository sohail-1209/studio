// src/app/page.tsx (Feed Page)
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Heart, MessageCircle as MessageIcon, Share2 } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Post } from '@/types/post';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeedPage() {
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'));

    setLoadingPosts(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure createdAt is a Timestamp, then convert to Date for client-side formatting
            // Firestore Timestamps are automatically converted when fetched if using appropriate types.
            // If it's still a Firestore Timestamp object, convert it. Otherwise, assume it's already a Date or needs parsing.
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || Date.now()),
          } as Post;
        });
        setPosts(fetchedPosts);
        setLoadingPosts(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoadingPosts(false);
        // Optionally, show a toast message here
      }
    );

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, []);

  const PostSkeleton = () => (
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="p-4">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-3 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Skeleton className="aspect-video w-full" />
        <div className="p-4">
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-4 h-4 w-3/4" />
          <div className="flex items-center justify-between text-muted-foreground">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );


  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-headline text-3xl font-bold text-foreground">Feed</h1>
          <Button onClick={() => setIsCreatePostDialogOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Create Post
          </Button>
        </div>

        <CreatePostDialog open={isCreatePostDialogOpen} onOpenChange={setIsCreatePostDialogOpen} />

        {/* Placeholder for Stories (can be dynamic later) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Stories</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-4 overflow-x-auto p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-1">
                <Avatar className="h-16 w-16 rounded-full border-2 border-pink-500 p-0.5">
                  <AvatarImage
                    src={`https://placehold.co/64x64.png/7E57C2/FFFFFF?text=U${i + 1}`}
                    alt={`User ${i + 1} story`}
                    data-ai-hint="portrait person"
                  />
                  <AvatarFallback>{`U`}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">User {i + 1}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-8">
          {loadingPosts && (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          )}
          {!loadingPosts && posts.length === 0 && (
            <Card className="py-12 text-center">
              <CardContent>
                <p className="text-lg font-semibold text-foreground">No posts yet!</p>
                <p className="text-muted-foreground">Be the first one to share something.</p>
              </CardContent>
            </Card>
          )}
          {!loadingPosts && posts.map((post) => (
            <Card key={post.id} className="overflow-hidden shadow-lg">
              <CardHeader className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={post.userAvatarUrl || `https://placehold.co/50x50.png?text=${post.userDisplayName?.charAt(0) || 'U'}`} alt={post.userDisplayName || 'User'} data-ai-hint="user avatar" />
                    <AvatarFallback>{(post.userDisplayName || 'User').substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{post.userDisplayName || 'Anonymous User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.createdAt ? formatDistanceToNow(post.createdAt, { addSuffix: true }) : 'just now'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {post.imageUrl && (
                  <div className="relative aspect-video w-full">
                    <Image src={post.imageUrl} alt="Post image" layout="fill" objectFit="cover" data-ai-hint={post.dataAiHint || "user content"} />
                  </div>
                )}
                {post.videoUrl && (
                  <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                    {/* In a real app, you'd use a <video> tag or a video player component */}
                    <Image src={post.videoUrl} alt="Post video placeholder" layout="fill" objectFit="contain" data-ai-hint={post.dataAiHint || "user content"} />
                  </div>
                )}
                {post.caption && <p className="p-4 text-foreground">{post.caption}</p>}
                
                <div className="border-t p-2">
                  <div className="flex items-center justify-around text-muted-foreground">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Heart className="mr-2 h-4 w-4" /> Likes ({post.likesCount || 0})
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                      <MessageIcon className="mr-2 h-4 w-4" /> Comments ({post.commentsCount || 0})
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
