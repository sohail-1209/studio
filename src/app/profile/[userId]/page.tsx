
// src/app/profile/[userId]/page.tsx
'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, MessageCircle, MoreVertical, Edit3, Image as ImageIcon, Loader2, Trash2, UserCheck, Clock, UserMinus, ShieldAlert, Users, Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp, setDoc, Timestamp, deleteDoc, writeBatch, onSnapshot, addDoc, limit, updateDoc, increment, type FieldValue } from 'firebase/firestore';
import { ref as storageRefDb, deleteObject } from 'firebase/storage';
import type { UserProfile as AuthContextUserProfile } from '@/contexts/AuthContext';
import type { Post } from '@/types/post';
import type { FollowRequestDocument } from '@/types/follow';
import type { NotificationDocument } from '@/types/notification';
import { useAuth } from '@/hooks/useAuth';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { FollowListDialog } from '@/components/profile/FollowListDialog';
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

interface UserProfile extends AuthContextUserProfile {
  coverPhotoURL?: string;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
}

type FollowStatus = 'not_following' | 'following' | 'pending';

const LoadingPostsPlaceholder = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 w-full min-w-0">
    {[...Array(6)].map((_, i) => (
      <Skeleton key={`post-skel-${i}`} className="aspect-square rounded-md min-w-0 bg-muted/50" />
    ))}
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

 const NoPostsPlaceholder = ({ message, subMessage }: { message?: string; subMessage?: string; }) => (
   <div className="py-12 text-center w-full">
     <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
     <p className="mt-4 text-lg font-semibold text-foreground">{message || "No posts yet"}</p>
     <p className="mt-1 text-sm text-muted-foreground">
       {subMessage || "This user hasn't shared any posts."}
     </p>
   </div>
 );

 const PrivateAccountPlaceholder = () => (
    <div className="py-12 text-center w-full">
        <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-semibold text-foreground">This Account is Private</p>
        <p className="mt-1 text-sm text-muted-foreground">
            Follow this account to see their posts and media.
        </p>
    </div>
 );

const ProfileSkeleton = () => (
    <Card className="w-full shadow-lg overflow-hidden">
      <div className="relative">
        <Skeleton className="h-48 md:h-64 w-full bg-muted/30" />
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-6 z-10">
          <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-card shadow-lg bg-muted" />
        </div>
      </div>
      <div className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4">
          <div className="mb-3 sm:mb-0">
            <Skeleton className="h-8 w-40 mb-1.5 bg-muted/50" />
            <Skeleton className="h-4 w-28 bg-muted/50" />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-full sm:w-24 bg-muted/50" />
            <Skeleton className="h-10 w-full sm:w-28 bg-muted/50" />
          </div>
        </div>
        <Skeleton className="h-5 w-3/4 mb-2 bg-muted/50" />
        <Skeleton className="h-5 w-1/2 mb-6 bg-muted/50" />
        <div className="flex space-x-6 text-sm text-muted-foreground mb-8">
          <Skeleton className="h-5 w-16 bg-muted/50" />
          <Skeleton className="h-5 w-20 bg-muted/50" />
          <Skeleton className="h-5 w-20 bg-muted/50" />
        </div>
      </div>
      <div className="px-0 sm:px-0 border-t border-border">
        <div className="flex w-full justify-around p-0 border-b border-border">
            <Skeleton className="h-12 flex-1 bg-muted/30" />
            <Skeleton className="h-12 flex-1 bg-muted/30" />
            <Skeleton className="h-12 flex-1 bg-muted/30" />
        </div>
        <div className="mt-0 p-4 sm:p-6">
             <LoadingPostsPlaceholder />
        </div>
      </div>
    </Card>
  );


export default function UserProfilePage({ params: paramsPromise }: { params: { userId: string } }) {
  const params = use(paramsPromise);
  const { userId: paramsUserId } = params;
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

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(true);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const [isFollowListDialogOpen, setIsFollowListDialogOpen] = useState(false);
  const [followListTitle, setFollowListTitle] = useState<'Followers' | 'Following'>('Followers');
  const [followListUsers, setFollowListUsers] = useState<UserProfile[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  const isOwnProfile = currentUser?.uid === paramsUserId;

  const checkFollowStatus = useCallback(async () => {
    if (!currentUser?.uid || !paramsUserId || isOwnProfile) return;
    const followDocId = `${currentUser.uid}_${paramsUserId}`;
    const followRequestRef = doc(db, 'followRequests', followDocId);

    try {
      const docSnap = await getDoc(followRequestRef);
      if (docSnap.exists()) {
        const status = docSnap.data()?.status;
        setFollowStatus(status as FollowStatus); // 'accepted' -> 'following'
        setExistingFollowDocId(followDocId);
      } else {
        setFollowStatus('not_following');
        setExistingFollowDocId(null);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
      setFollowStatus('not_following');
    }
  }, [currentUser, paramsUserId, isOwnProfile]);


  useEffect(() => {
    if (paramsUserId) {
      setLoadingProfile(true);
      const profileRef = doc(db, 'profiles', paramsUserId);
      const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile({...data, isPrivate: data.isPrivate || false});
        } else {
          toast({ title: "Profile not found", variant: "destructive" });
          setProfile(null);
        }
        setLoadingProfile(false);
      }, (error) => {
        console.error("Error fetching profile:", error);
        toast({ title: "Error fetching profile", description: error.message, variant: "destructive" });
        setLoadingProfile(false);
      });

      return () => unsubscribeProfile();
    }
  }, [paramsUserId, toast]);

  useEffect(() => {
    if (profile && currentUser && !isOwnProfile) {
      checkFollowStatus();
    }
  }, [profile, currentUser, isOwnProfile, checkFollowStatus]);

  useEffect(() => {
    if (!profile?.uid) {
      setUserPosts([]);
      setLoadingUserPosts(false);
      return;
    }

    const canViewPosts = isOwnProfile || !profile.isPrivate || followStatus === 'following';

    if (!canViewPosts && profile.isPrivate) {
      setUserPosts([]);
      setLoadingUserPosts(false);
      return;
    }

    setLoadingUserPosts(true);
    const postsColRef = collection(db, 'posts');
    const q = query(
      postsColRef,
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
        createdAt: (docSnapshot.data().createdAt as Timestamp).toDate(),
        isStory: docSnapshot.data().isStory || false,
      } as Post));
      setUserPosts(fetchedPosts);
      setLoadingUserPosts(false);
    }, (error) => {
      console.error(`Error fetching posts for user ${profile.uid}:`, error);
      toast({ title: "Error", description: "Could not load posts.", variant: "destructive" });
      setUserPosts([]);
      setLoadingUserPosts(false);
    });

    return () => unsubscribePosts();
  }, [profile?.uid, profile?.isPrivate, isOwnProfile, followStatus, toast]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profile || isOwnProfile || isProcessingFollow) return;
    setIsProcessingFollow(true);

    const followDocId = `${currentUser.uid}_${profile.uid}`;
    const followRequestRef = doc(db, 'followRequests', followDocId);
    const batch = writeBatch(db);

    try {
      if (followStatus === 'following' || followStatus === 'pending') { // Unfollow or Cancel Request
        batch.delete(followRequestRef);
        if (followStatus === 'following') {
          batch.update(doc(db, 'profiles', currentUser.uid), { followingCount: increment(-1) });
          batch.update(doc(db, 'profiles', profile.uid), { followersCount: increment(-1) });
        }
        await batch.commit();
        setFollowStatus('not_following');
        toast({ title: "Unfollowed", description: `You are no longer following ${profile.displayName || 'this user'}.` });

      } else { // Follow or Request Follow
        const isPrivate = profile.isPrivate || false;
        const newStatus = isPrivate ? 'pending' : 'following';

        const requestData: FollowRequestDocument = {
          requesterId: currentUser.uid,
          requesterDisplayName: currentUser.displayName,
          requesterAvatarUrl: currentUser.photoURL,
          recipientId: profile.uid,
          recipientDisplayName: profile.displayName,
          recipientAvatarUrl: profile.photoURL,
          status: newStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(followRequestRef, requestData);

        if (isPrivate) {
          const notifRef = doc(collection(db, 'notifications'));
          const notifData: Omit<NotificationDocument, 'createdAt' | 'id'> = {
            recipientId: profile.uid,
            actorId: currentUser.uid,
            actorDisplayName: currentUser.displayName,
            actorAvatarUrl: currentUser.photoURL,
            type: 'follow_request',
            followRequestId: followDocId,
            isRead: false,
          };
          batch.set(notifRef, { ...notifData, createdAt: serverTimestamp() });
          toast({ title: "Request Sent", description: `Your follow request was sent to ${profile.displayName}.` });
        } else {
          batch.update(doc(db, 'profiles', currentUser.uid), { followingCount: increment(1) });
          batch.update(doc(db, 'profiles', profile.uid), { followersCount: increment(1) });
          toast({ title: "Followed", description: `You are now following ${profile.displayName}.` });
        }
        await batch.commit();
        setFollowStatus(newStatus);
      }
    } catch (error: any) {
      console.error("Error in follow/unfollow operation: ", error);
      toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
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
        q = query(followRequestsRef, where('recipientId', '==', profile.uid), where('status', '==', 'following'));
      } else {
        q = query(followRequestsRef, where('requesterId', '==', profile.uid), where('status', '==', 'following'));
      }
      const querySnapshot = await getDocs(q);
      const userIdsToFetch: string[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as FollowRequestDocument;
        return type === 'followers' ? data.requesterId : data.recipientId;
      });

      if (userIdsToFetch.length === 0) {
        setFollowListUsers([]); setLoadingFollowList(false); return;
      }
      const fetchedProfiles: UserProfile[] = [];
      const MAX_IN_QUERY_SIZE = 30;
      for (let i = 0; i < userIdsToFetch.length; i += MAX_IN_QUERY_SIZE) {
          const chunk = userIdsToFetch.slice(i, i + MAX_IN_QUERY_SIZE);
          if (chunk.length > 0) {
            const profilesQuery = query(collection(db, 'profiles'), where('uid', 'in', chunk));
            const profilesSnapshot = await getDocs(profilesQuery);
            profilesSnapshot.forEach(profileDoc => {
                 if (profileDoc.exists()) { fetchedProfiles.push(profileDoc.data() as UserProfile); }
            });
          }
      }
      setFollowListUsers(fetchedProfiles);
    } catch (error: any) {
      console.error(`Error fetching ${type} for profile ${profile?.uid}:`, error);
      toast({ title: `Error Fetching ${type}`, description: error.message, variant: "destructive" });
      setFollowListUsers([]);
    } finally { setLoadingFollowList(false); }
  };

  const handleDeleteRequest = (post: Post) => {
    setPostToDelete(post);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete || !currentUser || postToDelete.userId !== currentUser.uid) {
      toast({ title: "Error", description: "Cannot delete this post.", variant: "destructive" });
      setIsDeleteDialogOpen(false); setPostToDelete(null); return;
    }
    setIsDeletingPost(true);
    try {
      const postRef = doc(db, 'posts', postToDelete.id);
      const commentsRef = collection(postRef, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);
      const commentBatch = writeBatch(db);
      commentsSnapshot.docs.forEach(commentDoc => { commentBatch.delete(commentDoc.ref); });
      await commentBatch.commit();
      if (postToDelete.imagePath) {
        const imageFileRef = storageRefDb(storage, postToDelete.imagePath);
        await deleteObject(imageFileRef).catch(storageError => {
          console.warn("Error deleting image from storage, but proceeding with post deletion:", storageError);
        });
      }
      await deleteDoc(postRef);
      toast({ title: "Post Deleted", description: "Your post has been successfully deleted." });
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast({ title: "Deletion Failed", description: error.message || "Could not delete post.", variant: "destructive" });
    } finally {
      setIsDeletingPost(false); setIsDeleteDialogOpen(false); setPostToDelete(null);
    }
  };


  if (loadingProfile || !paramsUserId) return <MainLayout><ProfileSkeleton /></MainLayout>;
  if (!profile) return <MainLayout><div className="text-center p-12">Profile not found.</div></MainLayout>;

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    if (currentUser && updatedProfile.uid === currentUser.uid) { reloadUser(); }
  };

  const FollowButtonComponent = () => {
    if (isProcessingFollow) return <Button disabled className="w-full sm:w-auto"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</Button>;
    switch (followStatus) {
        case 'following': return <Button variant="outline" onClick={handleFollowToggle} className="w-full sm:w-auto"><UserMinus className="mr-2 h-4 w-4" />Following</Button>;
        case 'pending': return <Button variant="secondary" onClick={handleFollowToggle} className="w-full sm:w-auto"><Clock className="mr-2 h-4 w-4" />Pending</Button>;
        default: return <Button onClick={handleFollowToggle} className="w-full sm:w-auto"><UserPlus className="mr-2 h-4 w-4" />Follow</Button>;
    }
  };
  const canMessage = !isOwnProfile;
  const canViewContent = isOwnProfile || !profile.isPrivate || followStatus === 'following';
  const displayPosts = userPosts.filter(p => !p.isStory);
  const displayMedia = userPosts.filter(p => !p.isStory && p.imageUrl);


  return (
    <MainLayout>
      <Card className="w-full shadow-lg overflow-hidden">
          <div className="relative">
            <div className="relative h-48 w-full md:h-64 bg-muted">
              <Image
                src={profile.coverPhotoURL || "https://placehold.co/1200x400.png"}
                alt={`${profile.displayName || 'User'}'s cover photo`}
                fill
                style={{objectFit: 'cover'}}
                data-ai-hint="abstract background landscape"
                sizes="(max-width: 768px) 100vw, 1200px"
                priority
              />
            </div>
            <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-6 z-10">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-card shadow-lg">
                <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName || 'User'} data-ai-hint="profile picture" />
                <AvatarFallback className="text-4xl sm:text-5xl">{(profile.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4">
              <div className="mb-3 sm:mb-0">
                <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{profile.displayName || 'Unnamed User'}</h1>
                <p className="text-sm text-muted-foreground">@{profile.username || profile.uid.substring(0,8)}</p>
              </div>
              <div className="flex flex-col space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                {isOwnProfile ? (
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} className="w-full sm:w-auto"><Edit3 className="mr-2 h-4 w-4" />Edit Profile</Button>
                ) : ( <> <FollowButtonComponent /> <Button variant="outline" onClick={handleMessageUser} disabled={isMessaging || !canMessage} className="w-full sm:w-auto"> {isMessaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />} Message </Button> </>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground mb-6 whitespace-pre-wrap leading-relaxed">{profile.bio || "No bio yet."}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6 text-sm text-muted-foreground mb-8">
              <span className="p-0.5 -m-0.5"><strong className="text-foreground font-medium">{displayPosts.length}</strong> Posts</span>
              <button
                onClick={() => fetchFollowList('followers')}
                className="hover:underline focus:outline-none focus:ring-1 focus:ring-ring rounded-sm p-0.5 -m-0.5 cursor-pointer disabled:no-underline disabled:cursor-default"
                aria-label={`View ${profile.displayName || 'user'}'s followers`}
                disabled={loadingFollowList}
              >
                <strong className="text-foreground font-medium">{profile.followersCount || 0}</strong> Followers
              </button>
              <button
                onClick={() => fetchFollowList('following')}
                className="hover:underline focus:outline-none focus:ring-1 focus:ring-ring rounded-sm p-0.5 -m-0.5 cursor-pointer disabled:no-underline disabled:cursor-default"
                aria-label={`View users ${profile.displayName || 'user'} is following`}
                disabled={loadingFollowList}
              >
                <strong className="text-foreground font-medium">{profile.followingCount || 0}</strong> Following
              </button>
            </div>
          </div>

          <div className="px-0 sm:px-0 border-t border-border">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="flex w-full justify-around bg-card p-0 border-b border-border rounded-none">
                <TabsTrigger value="posts" className="flex-1 py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">Posts</TabsTrigger>
                <TabsTrigger value="media" className="flex-1 py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">Media</TabsTrigger>
                <TabsTrigger value="likes" className="flex-1 py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">Likes</TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="mt-0 p-4 sm:p-6">
                {loadingUserPosts && <LoadingPostsPlaceholder />}
                {!loadingUserPosts && !canViewContent && <PrivateAccountPlaceholder />}
                {!loadingUserPosts && canViewContent && displayPosts.length === 0 && <NoPostsPlaceholder />}
                {!loadingUserPosts && canViewContent && displayPosts.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                    {displayPosts.map((post) => (
                      <div key={post.id} className="group relative aspect-square block w-full overflow-hidden rounded-md">
                        <Link href={`/post/${post.id}`}>
                          {post.imageUrl ? (
                            <Image src={post.imageUrl} alt={post.caption || 'User post'} fill sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" style={{objectFit: 'cover'}} className="transition-transform duration-300 group-hover:scale-105" data-ai-hint={post.dataAiHint || "photo content"} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground p-2">
                              <span className="text-xs text-center line-clamp-6">{post.caption || "Text Post"}</span>
                            </div>
                          )}
                        </Link>
                        {isOwnProfile && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/60 text-white hover:text-white rounded-full z-10">
                                <MoreVertical className="h-4 w-4" /> <span className="sr-only">More options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDeleteRequest(post)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="media" className="mt-0 p-4 sm:p-6">
                  {loadingUserPosts && <LoadingPostsPlaceholder />}
                  {!loadingUserPosts && !canViewContent && <PrivateAccountPlaceholder />}
                  {!loadingUserPosts && canViewContent && displayMedia.length === 0 && <NoMediaPlaceholder />}
                  {!loadingUserPosts && canViewContent && displayMedia.length > 0 && (
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                          {displayMedia.map((post) => (
                               <div key={post.id} className="group relative aspect-square block w-full overflow-hidden rounded-md">
                                  <Link href={`/post/${post.id}`}>
                                  <Image src={post.imageUrl!} alt={post.caption || 'User media'} fill sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" style={{objectFit: 'cover'}} className="transition-transform duration-300 group-hover:scale-105" data-ai-hint={post.dataAiHint || "photo content"} />
                                  </Link>
                                  {isOwnProfile && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/60 text-white hover:text-white rounded-full z-10">
                                        <MoreVertical className="h-4 w-4" /> <span className="sr-only">More options</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleDeleteRequest(post)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Media
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}
              </TabsContent>
              <TabsContent value="likes" className="mt-0 p-4 sm:p-6">
                  {!loadingUserPosts && !canViewContent && <PrivateAccountPlaceholder />}
                  {!loadingUserPosts && canViewContent && <NoLikesPlaceholder />}
              </TabsContent>
            </Tabs>
          </div>
        </Card>
        {isOwnProfile && profile && ( <EditProfileDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} userProfile={profile} onProfileUpdate={handleProfileUpdate} /> )}
        <FollowListDialog open={isFollowListDialogOpen} onOpenChange={setIsFollowListDialogOpen} title={followListTitle} users={followListUsers} loading={loadingFollowList} />
         {postToDelete && (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription> This action cannot be undone. This will permanently delete this {postToDelete.isStory ? 'story' : 'post'} and all its comments. </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPostToDelete(null)} disabled={isDeletingPost}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingPost}> {isDeletingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
    </MainLayout>
  );
}
