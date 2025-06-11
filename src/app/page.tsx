// src/app/page.tsx (Feed Page)
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Heart, MessageCircle as MessageIcon, Share2 } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import type { Post } from '@/types/post';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/shared/Spinner';
import { CommentInput } from '@/components/posts/CommentInput';
import { CommentList } from '@/components/posts/CommentList';
import { Separator } from '@/components/ui/separator';

export default function FeedPage() {
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLiking, setIsLiking] = useState<{[postId: string]: boolean}>({});
  // const [isCommenting, setIsCommenting] = useState<{[postId: string]: boolean}>({}); // Replaced by CommentInput's own state
  const [showComments, setShowComments] = useState<{[postId: string]: boolean}>({});


  useEffect(() => {
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'));

    setLoadingPosts(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || Date.now()),
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
            likesCount: data.likesCount || 0,
            commentsCount: data.commentsCount || 0,
          } as Post;
        });
        setPosts(fetchedPosts);
        setLoadingPosts(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoadingPosts(false);
        toast({
          title: 'Error Fetching Posts',
          description: 'Could not load the feed. Please try again later.',
          variant: 'destructive',
        });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const handleLikePost = async (postId: string, currentPost: Post) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Please log in to like posts.', variant: 'destructive' });
      return;
    }
    if (isLiking[postId]) return; 

    setIsLiking(prev => ({ ...prev, [postId]: true }));

    const postRef = doc(db, 'posts', postId);
    const alreadyLiked = currentPost.likedBy?.includes(user.uid);

    try {
      if (alreadyLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likesCount: increment(-1),
        });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likesCount: increment(1),
        });
      }
    } catch (error: any) {
      console.error('Error liking post:', error);
      toast({
        title: 'Error Liking Post',
        description: error.message || 'Could not update like. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLiking(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleCommentSection = (postId: string) => {
    setShowComments(prev => ({...prev, [postId]: !prev[postId]}));
  };

  const handleSharePost = async (post: Post) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Please log in to share posts.', variant: 'destructive' });
      return;
    }
    const shareData = {
      title: `Check out this post on NExCHAT by ${post.userDisplayName || 'a user'}!`,
      text: post.caption || 'An interesting post from NExCHAT.',
      url: window.location.origin + `/post/${post.id}`, 
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        console.warn('Warning sharing post via navigator.share (likely permission denied or non-HTTPS):', error);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(shareData.url);
            toast({
              title: 'Share Failed, Link Copied!',
              description: 'Could not open share dialog. Post link copied to clipboard.',
              variant: 'default', 
            });
          } catch (copyError) {
            console.error('Error copying link to clipboard:', copyError);
            toast({
              title: 'Share Failed',
              description: 'Could not share or copy the post link. Please try manually.',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Share Failed',
            description: 'Sharing is not supported or was blocked, and clipboard access is not available.',
            variant: 'destructive',
          });
        }
      }
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied!',
          description: 'Post link copied to clipboard. Share it with your friends!',
        });
      } catch (copyError) {
        console.error('Error copying link to clipboard:', copyError);
        toast({
          title: 'Share Unavailable',
          description: 'Could not copy the post link. Please try manually.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Share Unavailable',
        description: 'Sharing is not supported on this browser.',
        variant: 'destructive',
      });
    }
  };

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
        {/* Placeholder for comment section skeleton */}
        <div className="border-t p-4">
            <Skeleton className="h-10 w-full mb-3" /> {/* Comment input skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-8 w-3/5" />
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

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Stories</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-4 overflow-x-auto p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-1">
                <Avatar className="h-16 w-16 rounded-full border-2 border-pink-500 p-0.5">
                  <Image
                    src={`https://placehold.co/64x64.png/7E57C2/FFFFFF?text=U${i + 1}`}
                    alt={`User ${i + 1} story`}
                    width={64}
                    height={64}
                    className="rounded-full"
                    data-ai-hint="portrait person"
                  />
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
          {!loadingPosts && posts.map((post) => {
            const isLikedByCurrentUser = post.likedBy && user ? post.likedBy.includes(user.uid) : false;
            return (
              <Card key={post.id} className="overflow-hidden shadow-lg">
                <CardHeader className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                       {post.userAvatarUrl ? (
                        <Image src={post.userAvatarUrl} alt={post.userDisplayName || 'User'} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                      ) : (
                        <AvatarFallback>{(post.userDisplayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                      )}
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
                      <Image src={post.imageUrl} alt={post.caption || "Post image"} layout="fill" objectFit="cover" data-ai-hint={post.dataAiHint || "user content"} />
                    </div>
                  )}
                  {post.videoUrl && (
                    <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                       <Image src={post.videoUrl} alt={post.caption || "Post video placeholder"} layout="fill" objectFit="contain" data-ai-hint={post.dataAiHint || "user content video"} />
                    </div>
                  )}
                  {post.caption && <p className="p-4 text-foreground whitespace-pre-wrap">{post.caption}</p>}
                  
                  <div className="border-t p-2">
                    <div className="flex items-center justify-around text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleLikePost(post.id, post)}
                        disabled={isLiking[post.id]}
                      >
                        {isLiking[post.id] ? <Spinner size={16} className="mr-2" /> :
                          <Heart
                            className={`mr-2 h-4 w-4 ${isLikedByCurrentUser ? 'text-red-500' : 'text-muted-foreground'}`}
                            fill={isLikedByCurrentUser ? 'currentColor' : 'none'}
                          />
                        }
                        Likes ({post.likesCount || 0})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleCommentSection(post.id)}
                        // disabled={isCommenting[post.id]} // Replaced by CommentInput's own state
                      >
                        <MessageIcon className="mr-2 h-4 w-4" />
                        Comments ({post.commentsCount || 0})
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleSharePost(post)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </Button>
                    </div>
                  </div>
                  {showComments[post.id] && (
                    <div className="p-4 border-t">
                       <CommentInput postId={post.id} />
                       <Separator className="my-4" />
                       <CommentList postId={post.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
