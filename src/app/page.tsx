
// src/app/page.tsx (Feed Page)
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Heart, MessageCircle as MessageIcon, Share2, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useEffect, useCallback } from 'react';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { db, storage } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, increment, limit as firestoreLimit, where, getDocs, addDoc, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref as storageRefDb, deleteObject } from 'firebase/storage'; // Renamed to avoid conflict
import type { Post, PostDocument } from '@/types/post';
import type { NotificationDocument } from '@/types/notification';
import { formatDistanceToNow, subHours } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/shared/Spinner';
import { CommentInput } from '@/components/posts/CommentInput';
import { CommentList } from '@/components/posts/CommentList';
import { Separator } from '@/components/ui/separator';
import { StoryViewerDialog } from '@/components/stories/StoryViewerDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StoryUserData {
  userId: string;
  displayName: string | null;
  photoURL: string | null;
  dataAiHint?: string;
}

export default function FeedPage() {
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLiking, setIsLiking] = useState<{[postId: string]: boolean}>({});
  const [showComments, setShowComments] = useState<{[postId: string]: boolean}>({});

  const [storiesData, setStoriesData] = useState<StoryUserData[]>([]);
  const [loadingStoriesReel, setLoadingStoriesReel] = useState(true);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryAuthor, setSelectedStoryAuthor] = useState<StoryUserData | null>(null);
  const [currentUserStories, setCurrentUserStories] = useState<Post[]>([]);
  const [loadingCurrentUserStories, setLoadingCurrentUserStories] = useState(false);

  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);


  useEffect(() => {
    const postsCollectionRef = collection(db, 'posts');
    // Fetch only non-story posts from public accounts for the main feed
    const qPosts = query(
      postsCollectionRef,
      where('isStory', '!=', true),
      where('authorIsPrivate', '==', false), // Only show posts from public accounts
      orderBy('createdAt', 'desc')
    );

    setLoadingPosts(true);
    const unsubscribePosts = onSnapshot(
      qPosts,
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
            isStory: data.isStory || false,
            imagePath: data.imagePath || null,
          } as Post;
        });
        setPosts(fetchedPosts);
        setLoadingPosts(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoadingPosts(false);
        if (error.code === 'failed-precondition') {
           toast({
              title: "Error Fetching Feed Posts",
              description: "A database index might be required. Please check Firebase console.",
              variant: "destructive",
              duration: 10000
          });
        } else {
          toast({
            title: 'Error Fetching Posts',
            description: 'Could not load the feed. Please try again later.',
            variant: 'destructive',
          });
        }
      }
    );

    setLoadingStoriesReel(true);
    const twentyFourHoursAgo = subHours(new Date(), 24);
    const twentyFourHoursAgoTimestamp = Timestamp.fromDate(twentyFourHoursAgo);

    const qStoriesReel = query(
      postsCollectionRef,
      where('isStory', '==', true),
      where('createdAt', '>=', twentyFourHoursAgoTimestamp),
      // For stories, we might still want to show stories from private accounts the user *follows*,
      // but that's complex. For now, showing all recent stories, privacy relies on individual story access rules.
      // Or filter by authorIsPrivate == false here too for simplicity in the reel.
      // For now, let's keep it simple and rely on navigation to StoryViewer handling actual story content.
      // A more advanced reel would filter based on followed private users.
      orderBy('createdAt', 'desc'),
      firestoreLimit(20)
    );

    const unsubscribeStoriesReel = onSnapshot(qStoriesReel, (snapshot) => {
      const uniqueUsersMap = new Map<string, StoryUserData>();
      snapshot.docs.forEach(docSnapshot => {
        const post = docSnapshot.data() as PostDocument;
        if (post.userId && !uniqueUsersMap.has(post.userId) && (post.authorIsPrivate === false || post.userId === user?.uid)) { // Show public stories or own stories
          uniqueUsersMap.set(post.userId, {
            userId: post.userId,
            displayName: post.userDisplayName,
            photoURL: post.userAvatarUrl,
            dataAiHint: "portrait person",
          });
        }
      });
      setStoriesData(Array.from(uniqueUsersMap.values()).slice(0, 7));
      setLoadingStoriesReel(false);
    }, (error) => {
      console.error('Error fetching stories data for reel:', error);
      setLoadingStoriesReel(false);
      toast({
          title: 'Error Fetching Stories',
          description: 'Could not load stories reel. Please try again later.',
          variant: 'destructive',
        });
    });

    return () => {
      unsubscribePosts();
      unsubscribeStoriesReel();
    };
  }, [toast, user?.uid]); // Added user.uid as dependency for stories reel filtering

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

        if (user.uid !== currentPost.userId && !currentPost.isStory) { // Only notify for non-story posts
          const notificationsColRef = collection(db, 'notifications');
          let contentPreview = currentPost.caption
            ? (currentPost.caption.substring(0, 50) + (currentPost.caption.length > 50 ? '...' : ''))
            : (currentPost.imageUrl ? 'your image' : (currentPost.videoUrl ? 'your video' : 'your post'));

          const notificationData: Omit<NotificationDocument, 'createdAt'> = {
            recipientId: currentPost.userId,
            actorId: user.uid,
            actorDisplayName: user.displayName || 'Someone',
            actorAvatarUrl: user.photoURL || null,
            type: 'like',
            postId: postId,
            postContentPreview: contentPreview,
            isRead: false,
          };
          await addDoc(notificationsColRef, { ...notificationData, createdAt: serverTimestamp() });
        }
      }
    } catch (error: any) {
      console.error('Error liking post or creating notification:', error);
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
      title: `Check out this post on Synora by ${post.userDisplayName || 'a user'}!`,
      text: post.caption || 'An interesting post from Synora.',
      url: window.location.origin + `/post/${post.id}`, // Assumes post detail pages exist at /post/:id
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        console.warn('Warning sharing post via navigator.share:', error);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(shareData.url);
            toast({
              title: 'Share Failed, Link Copied!',
              description: 'Could not open share dialog. Post link copied to clipboard.',
            });
          } catch (copyError) {
            console.error('Error copying link to clipboard:', copyError);
            toast({ title: 'Share Failed', description: 'Could not share or copy the post link.', variant: 'destructive' });
          }
        } else {
           toast({ title: 'Share Failed', description: 'Sharing is not supported or was blocked.', variant: 'destructive'});
        }
      }
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({ title: 'Link Copied!', description: 'Post link copied to clipboard.' });
      } catch (copyError) {
        console.error('Error copying link to clipboard:', copyError);
        toast({ title: 'Share Unavailable', description: 'Could not copy the post link.', variant: 'destructive'});
      }
    } else {
      toast({ title: 'Share Unavailable', description: 'Sharing is not supported on this browser.', variant: 'destructive'});
    }
  };

  const handleStoryClick = useCallback(async (storyAuthor: StoryUserData) => {
    if (!storyAuthor.userId) return;

    setSelectedStoryAuthor(storyAuthor);
    setIsStoryViewerOpen(true);
    setLoadingCurrentUserStories(true);
    setCurrentUserStories([]);

    const twentyFourHoursAgo = subHours(new Date(), 24);
    const twentyFourHoursAgoTimestamp = Timestamp.fromDate(twentyFourHoursAgo);
    const postsCollectionRef = collection(db, 'posts');

    const q = query(
      postsCollectionRef,
      where('userId', '==', storyAuthor.userId),
      where('isStory', '==', true),
      where('createdAt', '>=', twentyFourHoursAgoTimestamp),
      orderBy('createdAt', 'desc')
    );

    try {
      const querySnapshot = await getDocs(q);
      const fetchedStories = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: (docSnap.data().createdAt as Timestamp).toDate(),
        imagePath: docSnap.data().imagePath || null,
      } as Post));
      setCurrentUserStories(fetchedStories);
    } catch (error: any) {
      console.error(`Error fetching stories for user ${storyAuthor.userId}:`, error);
      toast({ title: "Error Fetching Stories", description: error.message, variant: "destructive" });
      setCurrentUserStories([]);
    } finally {
      setLoadingCurrentUserStories(false);
    }
  }, [toast]);

  const handleDeleteRequest = (post: Post) => {
    setPostToDelete(post);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete || !user || postToDelete.userId !== user.uid) {
      toast({ title: "Error", description: "Cannot delete this post.", variant: "destructive" });
      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
      return;
    }
    setIsDeletingPost(true);
    try {
      const postRef = doc(db, 'posts', postToDelete.id);

      // 1. Delete comments subcollection
      const commentsRef = collection(postRef, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);
      const commentBatch = writeBatch(db);
      commentsSnapshot.docs.forEach(commentDoc => {
        commentBatch.delete(commentDoc.ref);
      });
      await commentBatch.commit();

      // 2. Delete image from storage (if exists)
      if (postToDelete.imagePath) {
        const imageFileRef = storageRefDb(storage, postToDelete.imagePath);
        await deleteObject(imageFileRef).catch(storageError => {
          console.warn("Error deleting image from storage, but proceeding with post deletion:", storageError);
          toast({ title: "Storage Warning", description: "Could not delete image file, but post will be deleted.", variant: "default", duration: 5000 });
        });
      }

      // 3. Delete the post document
      await deleteDoc(postRef);

      toast({ title: "Post Deleted", description: "Your post has been successfully deleted." });
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast({ title: "Deletion Failed", description: error.message || "Could not delete post.", variant: "destructive" });
    } finally {
      setIsDeletingPost(false);
      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };


  const PostSkeleton = () => (
    <Card className="overflow-hidden shadow-lg w-full">
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
        <div className="border-t p-4">
            <Skeleton className="h-10 w-full mb-3" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-8 w-3/5" />
            </div>
        </div>
      </CardContent>
    </Card>
  );

  const StorySkeleton = () => (
    <div className="flex flex-col items-center space-y-1.5">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="mt-1 h-3 w-12" />
    </div>
  );

  return (
    <MainLayout>
      <div className="w-full">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">Feed</h1>
          <Button onClick={() => setIsCreatePostDialogOpen(true)} size="default" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create Post
          </Button>
        </div>

        <CreatePostDialog open={isCreatePostDialogOpen} onOpenChange={setIsCreatePostDialogOpen} />

        <Card className="w-full shadow-lg mb-6 md:mb-8">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="font-headline text-xl">Stories</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-4 overflow-x-auto p-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {loadingStoriesReel && (
              [...Array(5)].map((_, i) => <StorySkeleton key={`story-skel-${i}`} />)
            )}
            {!loadingStoriesReel && storiesData.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No stories to show right now. Be the first to share one!</p>
            )}
            {!loadingStoriesReel && storiesData.map((storyUser) => {
              const isCurrentUserStoryAuthor = storyUser.userId === user?.uid;
              const storyAvatarUrl = isCurrentUserStoryAuthor ? user?.photoURL || storyUser.photoURL : storyUser.photoURL;
              const storyDisplayName = isCurrentUserStoryAuthor ? user?.displayName || storyUser.displayName : storyUser.displayName;
              const storyAvatarFallback = (storyDisplayName || 'U').charAt(0).toUpperCase();

              return (
                <div
                  key={storyUser.userId}
                  className="flex flex-col items-center space-y-1.5 cursor-pointer group flex-shrink-0"
                  onClick={() => handleStoryClick(storyUser)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleStoryClick(storyUser)}
                >
                  <Avatar className="h-16 w-16 rounded-full border-2 border-pink-500 p-0.5 group-hover:border-pink-400 transition-colors">
                    {storyAvatarUrl ? (
                      <Image
                        src={storyAvatarUrl}
                        alt={`${storyDisplayName || 'User'}'s story`}
                        width={64}
                        height={64}
                        className="rounded-full"
                        data-ai-hint={storyUser.dataAiHint || "portrait person"}
                      />
                    ) : (
                      <AvatarFallback>{storyAvatarFallback}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate w-16 text-center">
                    {storyDisplayName || 'User'}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {selectedStoryAuthor && (
          <StoryViewerDialog
            open={isStoryViewerOpen}
            onOpenChange={setIsStoryViewerOpen}
            stories={currentUserStories}
            author={selectedStoryAuthor}
            loadingStories={loadingCurrentUserStories}
            onDeleteStory={handleDeleteRequest}
          />
        )}

        <div className="space-y-6 md:space-y-8">
          {loadingPosts && (
            <> <PostSkeleton /> <PostSkeleton /> </>
          )}
          {!loadingPosts && posts.length === 0 && (
            <Card className="py-12 text-center w-full shadow-lg">
              <CardContent>
                <p className="text-lg font-semibold text-foreground">No posts yet!</p>
                <p className="text-muted-foreground">Be the first one to share something, or check out the Explore page.</p>
              </CardContent>
            </Card>
          )}
          {!loadingPosts && posts.map((post, index) => {
            const isCurrentUserPost = post.userId === user?.uid;
            const avatarUrl = isCurrentUserPost ? (user?.photoURL || post.userAvatarUrl) : post.userAvatarUrl;
            const avatarAlt = isCurrentUserPost ? (user?.displayName || 'Your avatar') : (post.userDisplayName || 'User avatar');
            const avatarFallbackInitial = (isCurrentUserPost ? (user?.displayName || 'U') : (post.userDisplayName || 'U')).charAt(0).toUpperCase();
            const postAuthorDisplayName = isCurrentUserPost ? (user?.displayName || 'You') : (post.userDisplayName || 'Anonymous User');
            const isLikedByCurrentUser = post.likedBy && user ? post.likedBy.includes(user.uid) : false;

            let postContentPreviewForComment = post.caption
                ? (post.caption.substring(0, 30) + (post.caption.length > 30 ? '...' : ''))
                : (post.imageUrl ? 'your image' : (post.videoUrl ? 'your video' : 'your post'));

            return (
              <Card key={post.id} className="overflow-hidden shadow-lg w-full">
                <CardHeader className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={avatarAlt} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                      ) : (
                        <AvatarFallback>{avatarFallbackInitial}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-grow">
                      <p className="font-semibold text-foreground">{postAuthorDisplayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.createdAt ? formatDistanceToNow(post.createdAt, { addSuffix: true }) : 'just now'}
                      </p>
                    </div>
                     {isCurrentUserPost && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteRequest(post)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {post.imageUrl && (
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/30">
                      <Image
                        src={post.imageUrl}
                        alt={post.caption || "Post image"}
                        fill
                        style={{objectFit: 'contain'}}
                        data-ai-hint={post.dataAiHint || "user content"}
                        priority={index < 2}
                        className="transition-opacity duration-300 hover:opacity-90"
                      />
                    </div>
                  )}
                  {post.videoUrl && (
                    <div className="relative aspect-[16/10] w-full bg-black flex items-center justify-center overflow-hidden">
                       <Image
                         src={post.videoUrl} // This will use the placeholder if videoUrl is a placeholder
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 py-2.5 hover:bg-accent/50"
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
                        className="flex-1 py-2.5 hover:bg-accent/50"
                        onClick={() => toggleCommentSection(post.id)}
                      >
                        <MessageIcon className="mr-2 h-4 w-4" />
                        Comments ({post.commentsCount || 0})
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 py-2.5 hover:bg-accent/50" onClick={() => handleSharePost(post)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </Button>
                    </div>
                  </div>
                  {showComments[post.id] && (
                    <div className="p-4 border-t border-border bg-muted/20">
                       <CommentInput
                          postId={post.id}
                          postOwnerId={post.userId}
                          postContentPreview={postContentPreviewForComment}
                        />
                       <Separator className="my-3 bg-border/70" />
                       <CommentList postId={post.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {postToDelete && (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this {postToDelete.isStory ? 'story' : 'post'} and all its comments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPostToDelete(null)} disabled={isDeletingPost}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingPost}>
                  {isDeletingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </MainLayout>
  );
}
