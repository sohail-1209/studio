
// src/app/post/[postId]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/shared/Spinner';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Post } from '@/types/post';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { CommentList } from '@/components/posts/CommentList'; // Assuming CommentList can be reused
import { CommentInput } from '@/components/posts/CommentInput'; // For adding new comments
import { Heart, MessageCircle, Share2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // For user context if needed for interactions
import { useRouter } from 'next/navigation';

const PostPageSkeleton = () => (
  <Card className="w-full shadow-lg">
    <CardHeader className="flex flex-row items-center space-x-3 border-b p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="border-t p-4">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="border-t p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default function IndividualPostPage({ params: paramsPromise }: { params: { postId: string } }) {
  const params = use(paramsPromise); // Resolve the promise from params
  const { postId } = params;
  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth(); // For potential future interactions
  const router = useRouter();

  useEffect(() => {
    if (!postId) {
      setLoadingPost(false);
      toast({ title: 'Error', description: 'Post ID is missing.', variant: 'destructive' });
      return;
    }

    const fetchPost = async () => {
      setLoadingPost(true);
      try {
        const postRef = doc(db, 'posts', postId as string);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = postSnap.data();
          const fetchedPost = {
            id: postSnap.id,
            ...postData,
            createdAt: (postData.createdAt as Timestamp).toDate(),
            likedBy: Array.isArray(postData.likedBy) ? postData.likedBy : [],
            likesCount: postData.likesCount || 0,
            commentsCount: postData.commentsCount || 0,
          } as Post;

          // Basic privacy check - enhance as needed
          if (fetchedPost.authorIsPrivate && fetchedPost.userId !== user?.uid) {
            // Further check if current user follows the author might be needed here
            // For now, redirect or show 'private' if not owner and post is by private account
            // This is a simplified check. Full follower check would be more complex.
            toast({ title: "Private Post", description: "This post is from a private account.", variant: "default"});
            setPost(null); // Or show a specific "Private Post" component
          } else {
            setPost(fetchedPost);
          }
        } else {
          toast({ title: 'Post Not Found', description: 'This post may have been deleted or never existed.', variant: 'destructive' });
          setPost(null);
        }
      } catch (error: any) {
        console.error('Error fetching post:', error);
        toast({ title: 'Error', description: 'Could not load the post.', variant: 'destructive' });
        setPost(null);
      } finally {
        setLoadingPost(false);
      }
    };

    fetchPost();
  }, [postId, toast, user?.uid]);

  // Dummy share function for this page, could be enhanced
  const handleShareThisPost = async () => {
    if (!post) return;
    const shareData = {
      title: `Post by ${post.userDisplayName || 'a user'} on Synora`,
      text: post.caption || 'Check out this post!',
      url: window.location.href, // Share the current page URL
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link Copied!", description: "Post link copied to clipboard." });
      } else {
        toast({ title: "Share Unavailable", description: "Cannot share or copy link.", variant: "default" });
      }
    } catch (error) {
      console.error("Error sharing post from post page:", error);
      toast({ title: "Share Failed", variant: "destructive" });
    }
  };
  
  // Placeholder for like functionality - can be implemented similarly to feed page
  const handleLikeThisPost = () => {
    if(!user) {
        toast({ title: "Please log in", description: "You need to be logged in to like posts.", variant: "default"});
        return;
    }
    toast({ title: "Like (Coming Soon)", description: "Liking posts on this page will be available soon!", variant: "default"});
    // Actual like logic would go here, updating Firestore and post state
  };


  if (loadingPost) {
    return <MainLayout><PostPageSkeleton /></MainLayout>;
  }

  if (!post) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-theme(spacing.24))]">
          <Card className="p-8 text-center shadow-lg">
            <CardTitle className="text-xl mb-2">Post Not Available</CardTitle>
            <p className="text-muted-foreground mb-4">
              The post you are looking for could not be found or is private.
            </p>
            <Button onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Feed
            </Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isLikedByCurrentUser = post.likedBy && user ? post.likedBy.includes(user.uid) : false;
   let postContentPreviewForComment = post.caption
                ? (post.caption.substring(0, 30) + (post.caption.length > 30 ? '...' : ''))
                : (post.imageUrl ? 'image post' : (post.videoUrl ? 'video post' : 'post'));


  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="overflow-hidden shadow-xl w-full">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Link href={`/profile/${post.userId}`} className="flex items-center space-x-3 group">
                        <Avatar>
                        {post.userAvatarUrl ? (
                            <Image src={post.userAvatarUrl} alt={post.userDisplayName || 'User'} width={40} height={40} className="rounded-full group-hover:opacity-90" data-ai-hint="user avatar" />
                        ) : (
                            <AvatarFallback>{(post.userDisplayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                        )}
                        </Avatar>
                        <div>
                        <p className="font-semibold text-foreground group-hover:underline">{post.userDisplayName || 'Anonymous User'}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                        </p>
                        </div>
                    </Link>
                </div>
                 <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-muted-foreground hover:text-foreground" title="Go to Feed">
                    <ArrowLeft className="h-5 w-5" />
                 </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {post.imageUrl && (
              <div className="relative aspect-[4/3] w-full bg-muted/30"> {/* aspect-video or aspect-[4/3] or dynamic */}
                <Image
                  src={post.imageUrl}
                  alt={post.caption || 'Post image'}
                  fill
                  style={{objectFit: 'contain'}}
                  data-ai-hint={post.dataAiHint || "user content"}
                  priority
                />
              </div>
            )}
             {post.videoUrl && (
                <div className="relative aspect-[16/9] w-full bg-black flex items-center justify-center">
                   <Image
                     src={post.videoUrl} 
                     alt={post.caption || "Post video placeholder"}
                     fill
                     style={{objectFit: 'contain'}}
                     data-ai-hint={post.dataAiHint || "user content video"}
                   />
                </div>
              )}
            {post.caption && <p className="p-4 text-foreground whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>}
            
            <div className="border-t border-border p-1.5">
              <div className="flex items-center justify-around text-muted-foreground">
                 <Button variant="ghost" size="sm" className="flex-1 py-2.5" onClick={handleLikeThisPost}>
                    <Heart className={`mr-2 h-4 w-4 ${isLikedByCurrentUser ? 'text-red-500' : ''}`} fill={isLikedByCurrentUser ? 'currentColor' : 'none'} />
                    Likes ({post.likesCount || 0})
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 py-2.5">
                    <MessageCircle className="mr-2 h-4 w-4" /> Comments ({post.commentsCount || 0})
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 py-2.5" onClick={handleShareThisPost}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20">
              <h3 className="text-md font-semibold text-foreground mb-2">Comments</h3>
               <CommentInput 
                  postId={post.id} 
                  postOwnerId={post.userId}
                  postContentPreview={postContentPreviewForComment}
                />
              <CommentList postId={post.id} />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

    
