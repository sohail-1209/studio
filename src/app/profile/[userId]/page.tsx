
// src/app/profile/[userId]/page.tsx
'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, MessageCircle, MoreHorizontal, Edit3, Image as ImageIcon, Loader2, Trash2, UserCheck, Clock, UserMinus, ShieldAlert, Users } from 'lucide-react';
import Image from 'next/image';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp, setDoc, Timestamp, deleteDoc, writeBatch, onSnapshot, addDoc, limit, updateDoc, increment } from 'firebase/firestore';
import type { UserProfile as AuthContextUserProfile } from '@/contexts/AuthContext';
import type { Post } from '@/types/post';
import type { FollowRequestDocument } from '@/types/follow';
import { useAuth } from '@/hooks/useAuth';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { FollowListDialog } from '@/components/profile/FollowListDialog'; // Import the new dialog
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


const LoadingPostsPlaceholder = () => (
  <div className="py-12 text-center w-full">
     <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
     <p className="mt-4 text-lg font-semibold text-foreground">Loading Posts...</p>
     <p className="mt-1 text-sm text-muted-foreground">
       Please wait a moment.
     </p>
   </div>
 );
 
 const NoMediaPlaceholder = () => (
   <div className="py-12 text-center w-full">
     <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
     <p className="mt-4 text-lg font-semibold text-foreground">No Media</p>
     <p className="mt-1 text-sm text-muted-foreground">
       This user hasn&apos;t shared any media yet.
     </p>
   </div>
 );
 
 const NoLikesPlaceholder = () => (
   <div className="py-12 text-center w-full">
     <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
     <p className="mt-4 text-lg font-semibold text-foreground">No Liked Posts</p>
     <p className="mt-1 text-sm text-muted-foreground">
         This user hasn&apos;t liked any posts yet.
     </p>
   </div>
 );
 
 const NoPostsPlaceholder = () => (
   <div className="py-12 text-center w-full">
     <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
     <p className="mt-4 text-lg font-semibold text-foreground">No posts yet</p>
     <p className="mt-1 text-sm text-muted-foreground">
       This user hasn&apos;t shared any posts.
     </p>
   </div>
 );


export default function UserProfilePage({ params: paramsPromise }: { params: { userId: string } }) {
  const params = use(paramsPromise);
  const { userId: paramsUserId } = params; // Renamed to avoid conflict with state/prop userId
  const { user: currentUser, reloadUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [isProcessingFollow, setIsProcessingFollow] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('not_following');
  const [existingFollowDocId, setExistingFollowDocId] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const [isFollowListDialogOpen, setIsFollowListDialogOpen] = useState(false);
  const [followListTitle, setFollowListTitle] = useState<'Followers' | 'Following'>('Followers');
  const [followListUsers, setFollowListUsers] = useState<UserProfile[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  const isOwnProfile = currentUser?.uid === paramsUserId;

  const checkFollowStatus = useCallback(async () => {
    if (!currentUser || !currentUser.uid || !paramsUserId || paramsUserId === '' || isOwnProfile) {
      console.log("checkFollowStatus: Pre-conditions not met. Skipping.", { currentUserUid: currentUser?.uid, targetUserId: paramsUserId, isOwnProfile });
      setFollowStatus('not_following');
      setExistingFollowDocId(null);
      setIsProcessingFollow(false);
      return;
    }
    setIsProcessingFollow(true);
    const followDocId = `${currentUser.uid}_${paramsUserId}`;
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
      if (error.code === 'permission-denied') {
        console.warn(
          `Firestore permission denied while checking follow status for profile ${paramsUserId}. ` +
          `UID: ${currentUser?.uid} attempting to read 'followRequests/${followDocId}'. ` +
          `Ensure Firestore rules allow this read (e.g., if request.auth.uid is part of followRequestId). Message: ${error.message}`
        );
        // No toast for permission denied as it's a dev/config issue
      } else {
        console.error("Error checking follow status:", error);
        console.error(`Error details - Code: ${error.code}, Name: ${error.name}, Message: ${error.message}`);
        toast({
            title: "Follow Status Check Failed",
            description: "Unable to determine follow status. Technical details logged to console.",
            variant: "default" // Changed from destructive
        });
      }
      setFollowStatus('not_following');
      setExistingFollowDocId(null);
    } finally {
        setIsProcessingFollow(false);
    }
  }, [currentUser, paramsUserId, isOwnProfile, toast]);


  useEffect(() => {
    if (paramsUserId) {
      setLoadingProfile(true);
      const profileRef = doc(db, 'profiles', paramsUserId);
      const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
        } else {
          console.warn("No such profile for userId:", paramsUserId);
          toast({ title: "Profile not found", variant: "destructive" });
          setProfile(null);
        }
        setLoadingProfile(false);
      }, (error) => {
        console.error("Error fetching profile:", error);
        toast({ title: "Error fetching profile", description: error.message, variant: "destructive" });
        setLoadingProfile(false);
      });
      
      return () => {
        unsubscribeProfile();
      };
    }
  }, [paramsUserId, toast]);

  useEffect(() => {
    if (profile && currentUser && !isOwnProfile) {
      checkFollowStatus();
    }
  }, [profile, currentUser, isOwnProfile, checkFollowStatus]);

  const handleFollowToggle = async () => {
    if (!currentUser || !currentUser.uid || !profile || !profile.uid || isOwnProfile || isProcessingFollow) {
      console.warn("handleFollowToggle: Pre-conditions not met or already processing.", {
        currentUserUid: currentUser?.uid,
        profileUid: profile?.uid,
        isOwnProfile,
        isProcessingFollow,
      });
      return;
    }

    setIsProcessingFollow(true);
    const batch = writeBatch(db);
    const currentUserProfileRef = doc(db, 'profiles', currentUser.uid);

    try {
      if (followStatus === 'following') {
        // ---- UNFOLLOW ACTION ----
        if (existingFollowDocId) {
          const followRequestRef = doc(db, 'followRequests', existingFollowDocId);
          console.log(`Attempting to DELETE: followRequests/${existingFollowDocId}`);
          batch.delete(followRequestRef);
        } else {
          console.warn("Cannot unfollow: existingFollowDocId is null. This might indicate a state inconsistency.");
          setIsProcessingFollow(false);
          toast({ title: "Unfollow Error", description: "Could not determine which follow record to remove.", variant: "destructive" });
          return;
        }
        
        console.log(`Attempting to UPDATE: profiles/${currentUser.uid} with { followingCount: increment(-1) }`);
        batch.update(currentUserProfileRef, { followingCount: increment(-1) });
        
        console.log("Unfollow Batch Operations Prepared:", batch);
        await batch.commit();

        setFollowStatus('not_following');
        setExistingFollowDocId(null);
        toast({ title: "Unfollowed", description: `You are no longer following ${profile.displayName}.` });

      } else {
        // ---- FOLLOW ACTION ----
        const newFollowDocId = `${currentUser.uid}_${profile.uid}`;
        const followRequestRef = doc(db, 'followRequests', newFollowDocId);
        const newRequestData: FollowRequestDocument = {
            requesterId: currentUser.uid, requesterDisplayName: currentUser.displayName, requesterAvatarUrl: currentUser.photoURL,
            recipientId: profile.uid, recipientDisplayName: profile.displayName, recipientAvatarUrl: profile.photoURL,
            status: 'accepted', 
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        };
        console.log(`Attempting to SET: followRequests/${newFollowDocId} with data:`, newRequestData);
        batch.set(followRequestRef, newRequestData);

        console.log(`Attempting to UPDATE: profiles/${currentUser.uid} with { followingCount: increment(1) }`);
        batch.update(currentUserProfileRef, { followingCount: increment(1) });

        const notificationRef = doc(collection(db, 'notifications'));
        const notificationData = {
            recipientId: profile.uid, 
            actorId: currentUser.uid, 
            actorDisplayName: currentUser.displayName,
            actorAvatarUrl: currentUser.photoURL,
            type: 'follow_accept', 
            originalFollowRequestId: newFollowDocId, 
            isRead: false,
            createdAt: serverTimestamp()
        };
        console.log(`Attempting to SET: notifications/${notificationRef.id} with data:`, notificationData);
        batch.set(notificationRef, notificationData);
        
        console.log("Follow Batch Operations Prepared:", batch);
        await batch.commit();

        setFollowStatus('following');
        setExistingFollowDocId(newFollowDocId);
        toast({ title: "Followed", description: `You are now following ${profile.displayName}.` });
      }

      await reloadUser(); 
      const targetUserProfileRef = doc(db, 'profiles', profile.uid);
      const updatedTargetProfileSnap = await getDoc(targetUserProfileRef);
      if (updatedTargetProfileSnap.exists()) {
        setProfile(updatedTargetProfileSnap.data() as UserProfile);
      }

    } catch (error: any) {
      console.error("FirebaseError in handleFollowToggle:", error);
      console.error(`Error details - Code: ${error.code}, Name: ${error.name}, Message: ${error.message}`);
      toast({ title: "Operation Failed", description: `Error: ${error.message || "Could not perform follow/unfollow action."}. Check console for details.`, variant: "destructive" });
      // It's important to re-check status in case of failure to ensure UI consistency.
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

  const fetchFollowList = async (type: 'followers' | 'following') => {
    if (!profile?.uid) return;

    setLoadingFollowList(true);
    setFollowListUsers([]);
    setFollowListTitle(type === 'followers' ? 'Followers' : 'Following');
    setIsFollowListDialogOpen(true);

    try {
      const followRequestsRef = collection(db, 'followRequests');
      let q;
      if (type === 'followers') {
        q = query(followRequestsRef, where('recipientId', '==', profile.uid), where('status', '==', 'accepted'));
      } else { // 'following'
        q = query(followRequestsRef, where('requesterId', '==', profile.uid), where('status', '==', 'accepted'));
      }

      const querySnapshot = await getDocs(q);
      const userIdsToFetch: string[] = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data() as FollowRequestDocument;
        if (type === 'followers') {
          userIdsToFetch.push(data.requesterId);
        } else {
          userIdsToFetch.push(data.recipientId);
        }
      });

      if (userIdsToFetch.length === 0) {
        setFollowListUsers([]);
        setLoadingFollowList(false);
        return;
      }
      
      const fetchedProfiles: UserProfile[] = [];
      const MAX_IN_QUERY_SIZE = 30; 
      for (let i = 0; i < userIdsToFetch.length; i += MAX_IN_QUERY_SIZE) {
          const chunk = userIdsToFetch.slice(i, i + MAX_IN_QUERY_SIZE);
          if (chunk.length > 0) {
            const profilesQuery = query(collection(db, 'profiles'), where('uid', 'in', chunk));
            const profilesSnapshot = await getDocs(profilesQuery);
            profilesSnapshot.forEach(profileDoc => {
                 if (profileDoc.exists()) {
                    fetchedProfiles.push(profileDoc.data() as UserProfile);
                }
            });
          }
      }
      setFollowListUsers(fetchedProfiles);

    } catch (error: any) {
      console.error(`Error fetching ${type} for profile ${profile?.uid}:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        fullError: error, 
      });
      toast({ title: `Error Fetching ${type}`, description: error.message || `An unknown error occurred. Please check the console for more details.`, variant: "destructive" });
      setFollowListUsers([]);
    } finally {
      setLoadingFollowList(false);
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
        // const imageFileRef = storageRef(storage, postToDelete.imagePath); 
        // await deleteObject(imageFileRef).catch(storageError => {
        // console.warn("Error deleting image from storage, but proceeding with post deletion:", storageError);
        // });
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
    <div className="w-full">
      <div className="bg-muted/30 p-0 relative border-b border-border">
        <Skeleton className="h-48 md:h-64 w-full" />
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-6 z-10">
          <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-background shadow-lg" />
        </div>
      </div>
      <div className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6 bg-background">
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
          <TabsContent value="posts" className="mt-6 w-full min-w-0 overflow-y-auto">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 w-full min-w-0">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md min-w-0" />
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );


  if (loadingProfile || !paramsUserId) {
    return (
      <MainLayout>
        <div className="w-full">
            <ProfileSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
     return (
      <MainLayout>
        <div className="text-center w-full">
            <div className="w-full shadow-lg h-full flex flex-col items-center justify-center bg-card rounded-lg">
              <div className="p-12">
                <h2 className="text-2xl font-semibold">Profile Not Found</h2>
                <p className="text-muted-foreground">The user profile you are looking for does not exist or could not be loaded.</p>
              </div>
            </div>
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
      <div className="w-full">
          <div className="bg-muted/20 p-0 relative border-b border-border">
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
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.photoURL || `https://placehold.co/128x128.png?text=${(profile.displayName || 'U').charAt(0)}`} alt={profile.displayName || 'User'} data-ai-hint="profile picture" />
                  <AvatarFallback className="text-4xl sm:text-5xl">{(profile.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
          
          <div className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6 bg-background">
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
              <span className="text-foreground font-medium"><strong>{0}</strong> Posts</span> 
              {isOwnProfile ? (
                <button onClick={() => fetchFollowList('followers')} className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm p-0.5 -m-0.5">
                  <strong className="text-foreground font-medium">{profile.followersCount || 0}</strong> Followers
                </button>
              ) : (
                <span>
                  <strong className="text-foreground font-medium">{profile.followersCount || 0}</strong> Followers
                </span>
              )}
              {isOwnProfile ? (
                <button onClick={() => fetchFollowList('following')} className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm p-0.5 -m-0.5">
                  <strong className="text-foreground font-medium">{profile.followingCount || 0}</strong> Following
                </button>
              ) : (
                <span>
                  <strong className="text-foreground font-medium">{profile.followingCount || 0}</strong> Following
                </span>
              )}
            </div>
          </div>

          <Tabs defaultValue="posts" className="w-full px-4 sm:px-6 pb-6 bg-background">
            <TabsList className="flex w-full bg-muted/60 p-1 rounded-md">
              <TabsTrigger value="posts" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Posts</TabsTrigger>
              <TabsTrigger value="media" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Media</TabsTrigger>
              <TabsTrigger value="likes" className={cn("flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm")}>Likes</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-6 w-full min-w-0 overflow-y-auto" forceMount>
              <NoPostsPlaceholder />
            </TabsContent>
            <TabsContent value="media" className="mt-6 w-full min-w-0 overflow-y-auto" forceMount>
              <NoMediaPlaceholder />
            </TabsContent>
            <TabsContent value="likes" className="mt-6 w-full min-w-0 overflow-y-auto" forceMount>
                <NoLikesPlaceholder />
            </TabsContent>
          </Tabs>

        {isOwnProfile && profile && (
          <EditProfileDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            userProfile={profile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
        <FollowListDialog
            open={isFollowListDialogOpen}
            onOpenChange={setIsFollowListDialogOpen}
            title={followListTitle}
            users={followListUsers}
            loading={loadingFollowList}
        />
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
    
