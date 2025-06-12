
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
import type { UserProfile as AuthContextUserProfile } from '@/contexts/AuthContext'; // Renamed to avoid conflict
import type { Post } from '@/types/post';
import type { FollowRequest, FollowRequestDocument } from '@/types/follow';
import type { NotificationDocument } from '@/types/notification';
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


interface UserProfile extends AuthContextUserProfile { // Keep this name for the page-specific extended profile
  coverPhotoURL?: string;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean; // Added for privacy feature
}

type FollowStatus = 'not_following' | 'pending_them' | 'pending_me' | 'following' | 'follow_back';


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
  const [existingRequestId, setExistingRequestId] = useState<string | null>(null); // ID of request *sent by current user*


  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const isOwnProfile = currentUser?.uid === userId;

  const checkFollowStatus = useCallback(async () => {
    if (!currentUser || !userId || isOwnProfile || !profile) {
      setFollowStatus('not_following');
      setExistingRequestId(null);
      setIsProcessingFollow(false);
      return;
    }

    setIsProcessingFollow(true);
    setFollowStatus('not_following');
    setExistingRequestId(null);

    try {
      const followRequestsRef = collection(db, 'followRequests');

      const qSentOrFollowing = query(
        followRequestsRef,
        where('requesterId', '==', currentUser.uid),
        where('recipientId', '==', userId),
        limit(1)
      );
      const sentOrFollowingSnapshot = await getDocs(qSentOrFollowing);

      if (!sentOrFollowingSnapshot.empty) {
        const request = sentOrFollowingSnapshot.docs[0].data() as FollowRequestDocument;
        const requestId = sentOrFollowingSnapshot.docs[0].id;
        if (request.status === 'pending') {
          setFollowStatus('pending_them');
          setExistingRequestId(requestId);
        } else if (request.status === 'accepted') {
          setFollowStatus('following');
          setExistingRequestId(requestId);
        } else {
          setFollowStatus('not_following'); // e.g. if 'declined' by system or an old state
        }
        setIsProcessingFollow(false);
        return;
      }

      // If no sent request, check if target is following current user (for 'follow_back' status)
      // or if they sent a request to current user ('pending_me')
      const qReceived = query(
        followRequestsRef,
        where('requesterId', '==', userId), // Target user is requester
        where('recipientId', '==', currentUser.uid), // Current user is recipient
        limit(1)
      );
      const receivedSnapshot = await getDocs(qReceived);

      if (!receivedSnapshot.empty) {
        const request = receivedSnapshot.docs[0].data() as FollowRequestDocument;
        if (request.status === 'pending') {
          setFollowStatus('pending_me');
          // existingRequestId remains null as this is a request TO the current user
        } else if (request.status === 'accepted') {
          // They are following current user. If current user is not following them, it's 'follow_back'
          setFollowStatus('follow_back');
        } else {
          setFollowStatus('not_following');
        }
      } else {
        setFollowStatus('not_following');
      }
    } catch (error: any) {
        console.error("Error checking follow status:", error);
        toast({ title: "Network Error", description: `Could not check follow status: ${error.message || 'Please try again.'}`, variant: "destructive"});
        setFollowStatus('not_following');
    } finally {
        setIsProcessingFollow(false);
    }
  }, [currentUser, userId, isOwnProfile, profile, toast]);


  useEffect(() => {
    if (userId) {
      setLoadingProfile(true);
      const profileRef = doc(db, 'profiles', userId);
      const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile({ ...data, isPrivate: data.isPrivate || false });
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


  const handleFollowRequestOrToggle = async () => {
    console.log("--- handleFollowRequestOrToggle START ---");
    console.log("Current User (client-side):", currentUser ? { uid: currentUser.uid, displayName: currentUser.displayName, isPrivate: currentUser.isPrivate } : "NULL");
    console.log("Target Profile (client-side):", profile ? { uid: profile.uid, displayName: profile.displayName, isPrivate: profile.isPrivate } : "NULL");

    if (!currentUser || !currentUser.uid) {
      console.error("CRITICAL: currentUser or currentUser.uid is null/undefined at START. Aborting.");
      toast({ title: "Authentication Error", description: "User not logged in.", variant: "destructive" });
      return;
    }
    if (!profile || !profile.uid) {
      console.error("CRITICAL: profile or profile.uid is null/undefined at START. Aborting.");
      toast({ title: "Profile Error", description: "Target profile data is missing.", variant: "destructive" });
      return;
    }
    if (isOwnProfile) {
      console.log("Attempting to follow self, returning.");
      return;
    }
    if (isProcessingFollow) {
      console.log("Already processing follow, returning.");
      return;
    }

    setIsProcessingFollow(true);
    let newRequestData: FollowRequestDocument | null = null;
    let notificationData: Omit<NotificationDocument, 'createdAt' | 'actionTaken'> | null = null;
    let updateCurrentUserFollowingCount = false;
    // let updateTargetUserFollowersCount = false; // We decided against client-side update for target's followers

    const followDocId = existingRequestId || `${currentUser.uid}_${profile.uid}`;
    const followRequestRef = doc(db, 'followRequests', followDocId);
    const batch = writeBatch(db);

    console.log("Generated/Using followDocId:", followDocId);
    console.log("Initial Follow Status (client-side):", followStatus);
    console.log("Target profile.isPrivate (client-side):", profile.isPrivate);

    try {
        if (profile.isPrivate) {
            console.log("Target profile IS PRIVATE.");
            if (followStatus === 'not_following' || followStatus === 'follow_back') { // Request to follow private
                newRequestData = {
                    requesterId: currentUser.uid, requesterDisplayName: currentUser.displayName, requesterAvatarUrl: currentUser.photoURL,
                    recipientId: profile.uid, recipientDisplayName: profile.displayName, recipientAvatarUrl: profile.photoURL,
                    status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                };
                batch.set(followRequestRef, newRequestData);
                
                const notificationRef = doc(collection(db, 'notifications'));
                notificationData = {
                    recipientId: profile.uid, actorId: currentUser.uid, actorDisplayName: currentUser.displayName, actorAvatarUrl: currentUser.photoURL,
                    type: 'follow_request', followRequestId: followRequestRef.id, isRead: false,
                };
                batch.set(notificationRef, { ...notificationData, createdAt: serverTimestamp() });
                console.log("Private Action: Requesting follow. status: pending. Notification type: follow_request");

            } else if (followStatus === 'pending_them') { // Cancel pending request
                batch.delete(followRequestRef);
                console.log("Private Action: Cancelling pending request. Deleting followRequest doc.");
                // No notification needed for cancellation
            } else if (followStatus === 'following') { // Unfollow private account
                batch.delete(followRequestRef);
                updateCurrentUserFollowingCount = true; // Decrement own following count
                // updateTargetUserFollowersCount = true; // Decrement target's followers count
                console.log("Private Action: Unfollowing. Deleting followRequest doc. Will update counters.");
            }
        } else { // Target profile is PUBLIC
            console.log("Target profile IS PUBLIC.");
            if (followStatus === 'following') { // Unfollow public account
                batch.delete(followRequestRef);
                updateCurrentUserFollowingCount = true;
                // updateTargetUserFollowersCount = true;
                console.log("Public Action: Unfollowing. Deleting followRequest doc. Will update counters.");
            } else { // Follow public account (not_following, follow_back, or even pending_them if state was weird)
                newRequestData = {
                    requesterId: currentUser.uid, requesterDisplayName: currentUser.displayName, requesterAvatarUrl: currentUser.photoURL,
                    recipientId: profile.uid, recipientDisplayName: profile.displayName, recipientAvatarUrl: profile.photoURL,
                    status: 'accepted', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                };
                batch.set(followRequestRef, newRequestData, { merge: true }); // Use merge for public follows
                updateCurrentUserFollowingCount = true;
                // updateTargetUserFollowersCount = true;

                const notificationRef = doc(collection(db, 'notifications'));
                notificationData = { // Send a "follow_accept" style notification for public direct follows
                    recipientId: profile.uid, actorId: currentUser.uid, actorDisplayName: currentUser.displayName, actorAvatarUrl: currentUser.photoURL,
                    type: 'follow_accept', originalFollowRequestId: followRequestRef.id, isRead: false,
                };
                batch.set(notificationRef, { ...notificationData, createdAt: serverTimestamp() });
                console.log("Public Action: Following. status: accepted. Notification type: follow_accept. Will update counters.");
            }
        }
        
        // Log final data before commit
        if (newRequestData) console.log("Data for followRequest document:", JSON.stringify(newRequestData));
        if (notificationData) console.log("Data for notification document:", JSON.stringify(notificationData));

        // Update profile counters if applicable
        if (updateCurrentUserFollowingCount) {
            const currentUserProfileRef = doc(db, 'profiles', currentUser.uid);
            const incrementValue = (profile.isPrivate && followStatus === 'following') || (!profile.isPrivate && followStatus === 'following') ? -1 : 1;
            console.log(`Updating current user (${currentUser.uid}) followingCount by ${incrementValue}`);
            batch.update(currentUserProfileRef, { followingCount: increment(incrementValue) });
        }
        // if (updateTargetUserFollowersCount) {
        //     const targetUserProfileRef = doc(db, 'profiles', profile.uid);
        //     const incrementValue = (followStatus === 'following') ? -1 : 1; // If currently following, then unfollowing (decrement). Else, following (increment).
        //     console.log(`Updating target user (${profile.uid}) followersCount by ${incrementValue}`);
        //     batch.update(targetUserProfileRef, { followersCount: increment(incrementValue) });
        // }


        console.log("Attempting batch.commit()...");
        await batch.commit();
        console.log("BATCH COMMIT SUCCESSFUL.");

        // UI Updates and Toasts
        if (profile.isPrivate) {
            if (followStatus === 'not_following' || followStatus === 'follow_back') {
                setFollowStatus('pending_them'); setExistingRequestId(followDocId);
                toast({ title: "Follow Request Sent" });
            } else if (followStatus === 'pending_them') {
                setFollowStatus('not_following'); setExistingRequestId(null);
                toast({ title: "Follow Request Cancelled" });
            } else if (followStatus === 'following') {
                setFollowStatus('not_following'); setExistingRequestId(null);
                toast({ title: "Unfollowed" });
            }
        } else { // Public profile
            if (followStatus === 'following') {
                setFollowStatus('not_following'); setExistingRequestId(null);
                toast({ title: "Unfollowed" });
            } else {
                setFollowStatus('following'); setExistingRequestId(followDocId);
                toast({ title: "Followed Successfully" });
            }
        }
        // Force re-fetch profile data for both users to update counts shown on page
        await reloadUser(); // Reloads current user's context data
        // To refresh target profile's counts, a direct fetch or onSnapshot update is needed for 'profile' state
        const updatedTargetProfileSnap = await getDoc(doc(db, 'profiles', profile.uid));
        if (updatedTargetProfileSnap.exists()) {
            setProfile(updatedTargetProfileSnap.data() as UserProfile);
        }

    } catch (error: any) {
        console.error("Error in handleFollowRequestOrToggle (Batch Commit or Logic):", error);
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        toast({ title: "Operation Failed", description: error.message || "Could not perform follow action.", variant: "destructive" });
        await checkFollowStatus(); // Re-fetch status to ensure UI consistency on error
    } finally {
        setIsProcessingFollow(false);
        console.log("--- handleFollowRequestOrToggle END ---");
    }
  };


  const handleMessageUser = async () => {
    if (!currentUser || !profile || currentUser.uid === profile.uid || isMessaging) return;

    const canMessage = followStatus === 'following' || (profile && !profile.isPrivate);

    if (!canMessage && profile && profile.isPrivate) {
        toast({ title: "Cannot Message", description: `You need to be following ${profile.displayName || 'this user'} to send them a message as their account is private.`, variant: "default" });
        return;
    }

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
      const batch = writeBatch(db);
      commentsSnapshot.docs.forEach(commentDoc => {
        batch.delete(commentDoc.ref);
      });
      await batch.commit();

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="likes">Likes</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="mt-6">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
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
            <Card className="w-full shadow-lg">
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
    if (profile.isPrivate) {
        switch (followStatus) {
            case 'pending_them':
                return <Button variant="outline" onClick={handleFollowRequestOrToggle} className="w-full sm:w-auto"><Clock className="mr-2 h-4 w-4" />Requested</Button>;
            case 'following':
                return <Button variant="outline" onClick={handleFollowRequestOrToggle} className="w-full sm:w-auto"><UserMinus className="mr-2 h-4 w-4" />Following</Button>;
            case 'pending_me': // Current user has a pending request FROM this profile
                return <Button onClick={() => router.push('/notifications')} className="w-full sm:w-auto"><UserCheck className="mr-2 h-4 w-4" />Respond to Request</Button>;
            case 'not_following': // Not following and no pending request sent by current user
            case 'follow_back': // Target user is following current user, but current user is not following back
            default:
                return <Button onClick={handleFollowRequestOrToggle} className="w-full sm:w-auto"><UserPlus className="mr-2 h-4 w-4" />Request Follow</Button>;
        }
    } else { // Public profile
        switch (followStatus) {
            case 'following':
                return <Button variant="outline" onClick={handleFollowRequestOrToggle} className="w-full sm:w-auto"><UserMinus className="mr-2 h-4 w-4" />Following</Button>;
            case 'not_following':
            case 'follow_back':
            case 'pending_them': // Should ideally resolve to 'following' or 'not_following' quickly for public
            case 'pending_me':   // This profile (public) is awaiting current user's response (unlikely for public direct follow model)
            default:
                return <Button onClick={handleFollowRequestOrToggle} className="w-full sm:w-auto"><UserPlus className="mr-2 h-4 w-4" />Follow</Button>;
        }
    }
 };

  const canViewPosts = isOwnProfile || !profile.isPrivate || (profile.isPrivate && followStatus === 'following');
  const canMessage = isOwnProfile ? false : (followStatus === 'following' || (!profile.isPrivate && (followStatus === 'not_following' || followStatus === 'follow_back')));


  return (
    <MainLayout>
      <div className="w-full">
          <Card className="overflow-hidden shadow-lg w-full">
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
            <CardContent className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6">
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
                <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                  <TabsTrigger value="posts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Posts</TabsTrigger>
                  <TabsTrigger value="media" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Media</TabsTrigger>
                  <TabsTrigger value="likes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Likes</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-6">
                  {loadingPosts && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
                    </div>
                  )}
                  {!loadingPosts && !canViewPosts && profile.isPrivate && (
                     <div className="py-12 text-center">
                      <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-lg font-semibold text-foreground">This Account is Private</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Follow this account to see their posts.
                      </p>
                    </div>
                  )}
                  {!loadingPosts && canViewPosts && posts.length === 0 && (
                    <div className="py-12 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-lg font-semibold text-foreground">No posts yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This user hasn't shared any posts.
                      </p>
                    </div>
                  )}
                  {!loadingPosts && canViewPosts && posts.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                      {posts.map(post => (
                        <div key={post.id} className="aspect-square relative rounded-md overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl">
                          <Image
                            src={post.imageUrl || "https://placehold.co/300x300.png?text=Post"}
                            alt={post.caption || `Post by ${profile.displayName}`}
                            fill
                            style={{objectFit: 'cover'}}
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
                <TabsContent value="media" className="mt-6">
                  <div className="py-12 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold text-foreground">No Media</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This user hasn't shared any media yet, or this tab is under construction.
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="likes" className="mt-6">
                   <div className="py-12 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-lg font-semibold text-foreground">No Liked Posts</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                          This user hasn't liked any posts, or this tab is under construction.
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

