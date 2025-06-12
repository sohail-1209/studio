// src/app/profile/[userId]/page.tsx
'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, MessageCircle, MoreHorizontal, Edit3, Image as ImageIcon, Loader2, Trash2, UserCheck, Clock, UserMinus, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp, setDoc, Timestamp, deleteDoc, writeBatch, onSnapshot, addDoc, limit, updateDoc, increment } from 'firebase/firestore';
import type { UserProfile as AuthContextUserProfile } from '@/contexts/AuthContext'; 
import type { Post } from '@/types/post';
import { useAuth } from '@/hooks/useAuth';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';


interface UserProfile extends AuthContextUserProfile { 
  coverPhotoURL?: string;
  followersCount?: number;
  followingCount?: number;
}

type FollowStatus = 'not_following' | 'following';


export default function UserProfilePage({ params: paramsPromise }: { params: { userId: string } }) {
  const params = use(paramsPromise);
  const { userId } = params;
  const { user: currentUser, reloadUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [isProcessingFollow, setIsProcessingFollow] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('not_following');
  const [existingFollowDocId, setExistingFollowDocId] = useState<string | null>(null);


  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const isOwnProfile = currentUser?.uid === userId;

  const checkFollowStatus = useCallback(async () => {
    if (!currentUser || !userId || isOwnProfile) {
      setFollowStatus('not_following');
      setExistingFollowDocId(null);
      setIsProcessingFollow(false);
      return;
    }

    setIsProcessingFollow(true);
    const followDocId = `${currentUser.uid}_${userId}`;
    const followRequestRef = doc(db, 'followRequests', followDocId);

    try {
      const docSnap = await getDoc(followRequestRef);
      if (docSnap.exists() && docSnap.data()?.status === 'accepted') {
        setFollowStatus('following');
        setExistingFollowDocId(followDocId);
      } else {
        setFollowStatus('not_following');
        setExistingFollowDocId(null);
      }
    } catch (error: any) {
        console.error("Error checking follow status:", error);
        toast({ title: "Network Error", description: `Could not check follow status: ${error.message || 'Please try again.'}`, variant: "destructive"});
        setFollowStatus('not_following'); 
    } finally {
        setIsProcessingFollow(false);
    }
  }, [currentUser, userId, isOwnProfile, toast]);


  useEffect(() => {
    if (userId) {
      setLoadingProfile(true);
      const profileRef = doc(db, 'profiles', userId);
      const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data); 
        } else {
          console.warn("No such profile for userId:", userId);
          toast({ title: "Profile not found", variant: "destructive" });
          setProfile(null);
        }
        setLoadingProfile(false);
      }, (error) => {
        console.error("Error fetching profile:", error);
        toast({ title: "Error fetching profile", description: error.message, variant: "destructive" });
        setLoadingProfile(false);
      });

      setLoadingPosts(true);
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        where('isStory', '!=', true), 
        orderBy('createdAt', 'desc')
      );

      const unsubscribePosts = onSnapshot(postsQuery, (querySnapshot) => {
        const userContent = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: (docSnap.data().createdAt as Timestamp)?.toDate ? (docSnap.data().createdAt as Timestamp).toDate() : new Date(),
          imagePath: docSnap.data().imagePath || null,
        } as Post));
        setPosts(userContent);
        setLoadingPosts(false);
      }, (error) => {
        console.error("Error fetching posts:", error);
        if (error.code === 'failed-precondition') {
             toast({
                title: "Error Fetching User Posts",
                description: "A database index might be required. Please check Firebase console.",
                variant: "destructive",
                duration: 10000
            });
        } else {
            toast({ title: "Error fetching posts", description: error.message, variant: "destructive" });
        }
        setLoadingPosts(false);
      });

      return () => {
        unsubscribeProfile();
        unsubscribePosts();
      };
    }
  }, [userId, toast]);

  useEffect(() => {
    if (profile && currentUser && !isOwnProfile) {
      checkFollowStatus();
    }
  }, [profile, currentUser, isOwnProfile, checkFollowStatus]);


  const handleFollowToggle = async () => {
    if (!currentUser || !currentUser.uid || !profile || !profile.uid || isOwnProfile || isProcessingFollow) {
      return;
    }

    setIsProcessingFollow(true);
    const batch = writeBatch(db);
    const currentUserProfileRef = doc(db, 'profiles', currentUser.uid);
    const targetUserProfileRef = doc(db, 'profiles', profile.uid);

    try {
      if (followStatus === 'following') { 
        if (existingFollowDocId) {
          const followRequestRef = doc(db, 'followRequests', existingFollowDocId);
          batch.delete(followRequestRef);
        }
        batch.update(currentUserProfileRef, { followingCount: increment(-1) });
        batch.update(targetUserProfileRef, { followersCount: increment(-1) });
        await batch.commit();
        setFollowStatus('not_following');
        setExistingFollowDocId(null);
        toast({ title: "Unfollowed", description: `You are no longer following ${profile.displayName}.` });
      } else { 
        const newFollowDocId = `${currentUser.uid}_${profile.uid}`;
        const followRequestRef = doc(db, 'followRequests', newFollowDocId);
        const newRequestData = { 
            requesterId: currentUser.uid, requesterDisplayName: currentUser.displayName, requesterAvatarUrl: currentUser.photoURL,
            recipientId: profile.uid, recipientDisplayName: profile.displayName, recipientAvatarUrl: profile.photoURL,
            status: 'accepted', 
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        };
        batch.set(followRequestRef, newRequestData);
        batch.update(currentUserProfileRef, { followingCount: increment(1) });
        batch.update(targetUserProfileRef, { followersCount: increment(1) });

        const notificationRef = doc(collection(db, 'notifications'));
        const notificationData = { 
            recipientId: profile.uid, actorId: currentUser.uid, actorDisplayName: currentUser.displayName, actorAvatarUrl: currentUser.photoURL,
            type: 'follow_accept', 
            originalFollowRequestId: newFollowDocId, 
            isRead: false,
            createdAt: serverTimestamp()
        };
        batch.set(notificationRef, notificationData);

        await batch.commit();
        setFollowStatus('following');
        setExistingFollowDocId(newFollowDocId);
        toast({ title: "Followed", description: `You are now following ${profile.displayName}.` });
      }
      await reloadUser();
      const updatedTargetProfileSnap = await getDoc(targetUserProfileRef);
      if (updatedTargetProfileSnap.exists()) {
        setProfile(updatedTargetProfileSnap.data() as UserProfile);
      }

    } catch (error: any) {
      console.error("Error in handleFollowToggle:", error);
      toast({ title: "Operation Failed", description: error.message || "Could not perform follow/unfollow action.", variant: "destructive" });
      await checkFollowStatus(); 
    } finally {
      setIsProcessingFollow(false);
    }
  };


  const handleMessageUser = async () => {
    if (!currentUser || !profile || currentUser.uid === profile.uid || isMessaging) return;

    setIsMessaging(true);
    const chatId = [currentUser.uid, profile.uid].sort().join('_');
    const chatDocRef = doc(db, 'chats', chatId);

    try {
      const chatSnap = await getDoc(chatDocRef);
      if (chatSnap.exists()) {
        router.push(`/messages/${chatId}`);
      } else {
        const newChatData = {
          userIds: [currentUser.uid, profile.uid],
          userDetails: {
            [currentUser.uid]: {
              displayName: currentUser.displayName || 'Current User',
              photoURL: currentUser.photoURL || `https://placehold.co/40x40.png?text=${(currentUser.displayName || 'C').charAt(0)}`,
            },
            [profile.uid]: {
              displayName: profile.displayName || 'Selected User',
              photoURL: profile.photoURL || `https://placehold.co/40x40.png?text=${(profile.displayName || 'S').charAt(0)}`,
            },
          },
          lastMessageText: null,
          lastMessageSenderId: null,
          lastMessageTimestamp: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(chatDocRef, newChatData);
        router.push(`/messages/${chatId}`);
      }
    } catch (error: any) {
      console.error("Error starting or finding chat:", error);
      toast({ title: "Messaging Error", description: error.message || "Could not start chat.", variant: "destructive" });
    } finally {
      setIsMessaging(false);
    }
  };

  const handleDeleteRequest = (post: Post) => {
    setPostToDelete(post);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete || !currentUser || postToDelete.userId !== currentUser.uid) {
      toast({ title: "Error", description: "Cannot delete this post.", variant: "destructive" });
      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
      return;
    }
    setIsDeletingPost(true);
    try {
      const postRef = doc(db, 'posts', postToDelete.id);

      const commentsRef = collection(postRef, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);
      const commentBatch = writeBatch(db);
      commentsSnapshot.docs.forEach(commentDoc => {
        commentBatch.delete(commentDoc.ref);
      });
      await commentBatch.commit();

      if (postToDelete.imagePath) {
        const { ref: storageRefFc, deleteObject: deleteObjectFc } = await import('firebase/storage');
        const imageFileRef = storageRefFc(storage, postToDelete.imagePath);
        await deleteObjectFc(imageFileRef).catch(storageError => {
          console.warn("Error deleting image from storage, but proceeding with post deletion:", storageError);
        });
      }

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

  const ProfileSkeleton = () => (
    <Card className="overflow-hidden shadow-lg w-full">
      <CardHeader className="bg-muted/30 p-0 relative">
        <Skeleton className="h-48 md:h-64 w-full" />
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-6">
          <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-card" />
        </div>
      </CardHeader>
      <CardContent className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4">
          <div className="mb-3 sm:mb-0">
            <Skeleton className="h-8 w-40 mb-1.5" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-full sm:w-24" />
            <Skeleton className="h-10 w-full sm:w-28" />
          </div>
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-5 w-1/2 mb-6" />
        <div className="flex space-x-6 text-sm text-muted-foreground mb-8">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="flex w-full bg-muted/60 p-1 rounded-md">
            <TabsTrigger value="posts" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Posts</TabsTrigger>
            <TabsTrigger value="media" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Media</TabsTrigger>
            <TabsTrigger value="likes" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Likes</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="mt-6 w-full">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 w-full min-w-0">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md min-w-0" />
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  if (loadingProfile || !userId) {
    return (
      <MainLayout>
        <div className="h-[calc(100vh-theme(spacing.24))] w-full">
            <ProfileSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
     return (
      <MainLayout>
        <div className="text-center h-[calc(100vh-theme(spacing.24))] w-full">
            <Card className="w-full shadow-lg h-full flex flex-col items-center justify-center">
              <CardContent className="p-12">
                <h2 className="text-2xl font-semibold">Profile Not Found</h2>
                <p className="text-muted-foreground">The user profile you are looking for does not exist or could not be loaded.</p>
              </CardContent>
            </Card>
          </div>
      </MainLayout>
    );
  }

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    if (currentUser && updatedProfile.uid === currentUser.uid) {
        reloadUser();
    }
  };

 const FollowButtonComponent = () => {
    if (isProcessingFollow) {
        return <Button disabled className="w-full sm:w-auto"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</Button>;
    }
    switch (followStatus) {
        case 'following':
            return <Button variant="outline" onClick={handleFollowToggle} className="w-full sm:w-auto"><UserMinus className="mr-2 h-4 w-4" />Following</Button>;
        case 'not_following':
        default:
            return <Button onClick={handleFollowToggle} className="w-full sm:w-auto"><UserPlus className="mr-2 h-4 w-4" />Follow</Button>;
    }
 };

  const canMessage = !isOwnProfile;


  return (
    <MainLayout>
      <div className="h-[calc(100vh-theme(spacing.24))] w-full">
          <Card className="overflow-hidden shadow-lg w-full h-full flex flex-col">
            <CardHeader className="bg-muted/20 p-0 relative border-b border-border">
              <div className="relative h-48 w-full md:h-64">
                <Image
                  src={profile.coverPhotoURL || "https://placehold.co/1200x400.png"}
                  alt={`${profile.displayName || 'User'}'s cover photo`}
                  fill
                  style={{objectFit: 'cover'}}
                  data-ai-hint="abstract background landscape"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                />
                <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-6 z-10">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-card shadow-lg">
                    <AvatarImage src={profile.photoURL || `https://placehold.co/128x128.png?text=${(profile.displayName || 'U').charAt(0)}`} alt={profile.displayName || 'User'} data-ai-hint="profile picture" />
                    <AvatarFallback className="text-4xl sm:text-5xl">{(profile.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-16 sm:pt-20 px-4 sm:px-6 pb-6 overflow-y-scroll">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4">
                <div className="mb-3 sm:mb-0">
                  <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{profile.displayName || 'Unnamed User'}</h1>
                  <p className="text-sm text-muted-foreground">@{profile.username || profile.uid.substring(0,8)}</p>
                </div>
                <div className="flex flex-col space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  {isOwnProfile ? (
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} className="w-full sm:w-auto"><Edit3 className="mr-2 h-4 w-4" />Edit Profile</Button>
                  ) : (
                    <>
                      <FollowButtonComponent />
                      <Button variant="outline" onClick={handleMessageUser} disabled={isMessaging || !canMessage} className="w-full sm:w-auto">
                        {isMessaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                        Message
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm text-foreground mb-6 whitespace-pre-wrap leading-relaxed">{profile.bio || "No bio yet."}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6 text-sm text-muted-foreground mb-8">
                <span><strong className="text-foreground font-medium">{posts.length}</strong> Posts</span>
                <span><strong className="text-foreground font-medium">{profile.followersCount || 0}</strong> Followers</span>
                <span><strong className="text-foreground font-medium">{profile.followingCount || 0}</strong> Following</span>
              </div>

              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="flex w-full bg-muted/60 p-1 rounded-md">
                  <TabsTrigger value="posts" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Posts</TabsTrigger>
                  <TabsTrigger value="media" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Media</TabsTrigger>
                  <TabsTrigger value="likes" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Likes</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-6 w-full">
                  {loadingPosts && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 w-full min-w-0">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md min-w-0" />)}
                    </div>
                  )}
                  
                  {!loadingPosts && posts.length === 0 && (
                    <div className="py-12 text-center w-full">
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-lg font-semibold text-foreground">No posts yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This user hasn&apos;t shared any posts.
                      </p>
                    </div>
                  )}
                  {!loadingPosts && posts.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 w-full min-w-0">
                      {posts.map(post => (
                        <div key={post.id} className="aspect-square relative rounded-md overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl min-w-0">
                          <Image
                            src={post.imageUrl || "https://placehold.co/300x300.png?text=Post"}
                            alt={post.caption || `Post by ${profile.displayName}`}
                            fill
                            style={{objectFit: 'contain'}}
                            data-ai-hint={post.dataAiHint || "user content"}
                            className="transition-transform duration-300 group-hover:scale-105"
                          />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-start p-2">
                              {isOwnProfile && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="absolute top-1.5 right-1.5 text-white/80 hover:bg-white/20 hover:text-white h-7 w-7 z-10">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDeleteRequest(post)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="media" className="mt-6 w-full">
                  <div className="py-12 text-center w-full">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold text-foreground">No Media</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This user hasn&apos;t shared any media yet, or this tab is under construction.
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="likes" className="mt-6 w-full">
                   <div className="py-12 text-center w-full">
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-lg font-semibold text-foreground">No Liked Posts</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                          This user hasn&apos;t liked any posts, or this tab is under construction.
                      </p>
                   </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        {isOwnProfile && profile && (
          <EditProfileDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            userProfile={profile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
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
    
    
