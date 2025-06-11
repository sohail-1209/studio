
// src/app/profile/[userId]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, MessageCircle, MoreHorizontal, Edit3, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp, setDoc, Timestamp, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
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


interface UserProfile extends AuthContextUserProfile {
  coverPhotoURL?: string;
  followersCount?: number;
  followingCount?: number;
}


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

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    if (userId) {
      setLoadingProfile(true);
      const profileRef = doc(db, 'profiles', userId);
      const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => { // Use onSnapshot for real-time updates
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          console.error("No such profile!");
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
        const userPosts = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: (docSnap.data().createdAt as Timestamp)?.toDate ? (docSnap.data().createdAt as Timestamp).toDate() : new Date(),
          imagePath: docSnap.data().imagePath || null,
        } as Post));
        setPosts(userPosts);
        setLoadingPosts(false);
      }, (error) => {
        console.error("Error fetching posts:", error);
        if (error.code === 'failed-precondition') {
             toast({ 
                title: "Error Fetching Posts", 
                description: "A database index might be required for this query. Please check Firebase console.", 
                variant: "destructive",
                duration: 10000
            });
        } else {
            toast({ title: "Error fetching posts", description: error.message, variant: "destructive" });
        }
        setLoadingPosts(false);
      });
      
      return () => { // Cleanup snapshots
        unsubscribeProfile();
        unsubscribePosts();
      };
    }
  }, [userId, toast]);

  const handleMessageUser = async () => {
    if (!currentUser || !profile || currentUser.uid === profile.uid) return;
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
        const imageFileRef = storageRef(storage, postToDelete.imagePath);
        await deleteObject(imageFileRef).catch(storageError => {
          console.warn("Error deleting image from storage, but proceeding with post deletion:", storageError);
        });
      }

      await deleteDoc(postRef);
      toast({ title: "Post Deleted", description: "Your post has been successfully deleted." });
      // UI updates via onSnapshot
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
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="bg-muted/30 p-0">
        <Skeleton className="h-48 w-full" />
        <div className="absolute -bottom-16 left-8">
          <Skeleton className="h-32 w-32 rounded-full border-4 border-card" />
        </div>
        <div className="pt-20 px-8 pb-6 flex justify-between items-end">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8">
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
          <TabsContent value="posts">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
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
        <div className="container mx-auto max-w-4xl py-8">
          <ProfileSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
     return (
      <MainLayout>
        <div className="container mx-auto max-w-4xl py-8 text-center">
          <Card>
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
    setProfile(updatedProfile); // Local state update, onSnapshot will catch DB changes
    reloadUser(); // Reload auth user context if needed
  };


  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-muted/30 p-0">
            <div className="relative h-48 w-full">
              <Image
                src={profile.coverPhotoURL || "https://placehold.co/1200x300.png/E1D9F3/332E40"} 
                alt={`${profile.displayName || 'User'}'s cover photo`}
                fill
                style={{objectFit: 'cover'}}
                data-ai-hint="abstract background"
                priority
              />
              <div className="absolute -bottom-16 left-8">
                <Avatar className="h-32 w-32 border-4 border-card shadow-md">
                  <AvatarImage src={profile.photoURL || `https://placehold.co/128x128.png?text=${(profile.displayName || 'U').charAt(0)}`} alt={profile.displayName || 'User'} data-ai-hint="profile picture" />
                  <AvatarFallback>{(profile.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="pt-20 px-8 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end">
              <div className="mb-4 sm:mb-0">
                <h1 className="font-headline text-3xl font-bold text-foreground">{profile.displayName || 'Unnamed User'}</h1>
                <p className="text-sm text-muted-foreground">@{profile.username || profile.uid.substring(0,8)}</p>
              </div>
              <div className="flex space-x-2">
                {isOwnProfile ? (
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}><Edit3 className="mr-2 h-4 w-4" />Edit Profile</Button>
                ) : (
                  <>
                    <Button><UserPlus className="mr-2 h-4 w-4" />Follow</Button>
                    <Button variant="outline" onClick={handleMessageUser} disabled={isMessaging}>
                      {isMessaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                      Message
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-foreground mb-6 whitespace-pre-wrap">{profile.bio || "No bio yet."}</p>
            <div className="flex space-x-6 text-sm text-muted-foreground mb-8">
              <span><strong className="text-foreground">{posts.length}</strong> Posts</span>
              <span><strong className="text-foreground">{profile.followersCount || 0}</strong> Followers</span>
              <span><strong className="text-foreground">{profile.followingCount || 0}</strong> Following</span>
            </div>

            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="likes">Likes</TabsTrigger>
              </TabsList>
              <TabsContent value="posts">
                {loadingPosts && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
                  </div>
                )}
                {!loadingPosts && posts.length === 0 && (
                  <div className="py-12 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold text-foreground">No posts yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This user hasn't shared any posts.
                    </p>
                  </div>
                )}
                {!loadingPosts && posts.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                    {posts.map(post => (
                      <div key={post.id} className="aspect-square relative rounded-md overflow-hidden group cursor-pointer">
                        <Image
                          src={post.imageUrl || "https://placehold.co/300x300.png/CCC/FFF?text=Post"}
                          alt={post.caption || `Post by ${profile.displayName}`}
                          fill
                          style={{objectFit: 'cover'}}
                          data-ai-hint={post.dataAiHint || "user content"}
                          className="transition-transform duration-300 group-hover:scale-105"
                        />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                            {isOwnProfile && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 text-white hover:bg-white/20 hover:text-white h-8 w-8">
                                    <MoreHorizontal className="h-5 w-5" />
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
              <TabsContent value="media">
                <div className="py-12 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-semibold text-foreground">No Media</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This user hasn't shared any media yet, or this tab is under construction.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="likes">
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
      </div>
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
    </MainLayout>
  );
}

