// src/app/profile/[userId]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, MessageCircle, MoreHorizontal, Edit3, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile as AuthContextUserProfile } from '@/contexts/AuthContext'; // Renamed to avoid conflict
import type { Post } from '@/types/post';
import { useAuth } from '@/hooks/useAuth';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Define a local UserProfile type that extends the one from AuthContext if needed
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

  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    if (userId) {
      setLoadingProfile(true);
      const profileRef = doc(db, 'profiles', userId);
      getDoc(profileRef).then(docSnap => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          console.error("No such profile!");
          toast({ title: "Profile not found", variant: "destructive" });
          setProfile(null); 
        }
      }).catch(error => {
        console.error("Error fetching profile:", error);
        toast({ title: "Error fetching profile", description: error.message, variant: "destructive" });
      }).finally(() => {
        setLoadingProfile(false);
      });

      setLoadingPosts(true);
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        where('isStory', '!=', true), // Filter out stories
        orderBy('createdAt', 'desc')
      );
      getDocs(postsQuery).then(querySnapshot => {
        const userPosts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate ? (doc.data().createdAt as Timestamp).toDate() : new Date()
        } as Post));
        setPosts(userPosts);
      }).catch(error => {
        console.error("Error fetching posts:", error);
        toast({ title: "Error fetching posts", description: error.message, variant: "destructive" });
      }).finally(() => {
        setLoadingPosts(false);
      });
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
  
  const ProfileSkeleton = () => (
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="bg-muted/30 p-0">
        <Skeleton className="h-48 w-full" /> {/* Cover photo skeleton */}
        <div className="absolute -bottom-16 left-8">
          <Skeleton className="h-32 w-32 rounded-full border-4 border-card" /> {/* Avatar skeleton */}
        </div>
        <div className="pt-20 px-8 pb-6 flex justify-between items-end">
          <div>
            <Skeleton className="h-9 w-48 mb-2" /> {/* Name skeleton */}
            <Skeleton className="h-4 w-32" /> {/* Username skeleton */}
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" /> {/* Button skeleton */}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <Skeleton className="h-5 w-3/4 mb-2" /> {/* Bio line 1 skeleton */}
        <Skeleton className="h-5 w-1/2 mb-6" /> {/* Bio line 2 skeleton */}
        <div className="flex space-x-6 text-sm text-muted-foreground mb-8">
          <Skeleton className="h-5 w-16" /> {/* Posts count skeleton */}
          <Skeleton className="h-5 w-20" /> {/* Followers count skeleton */}
          <Skeleton className="h-5 w-20" /> {/* Following count skeleton */}
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
    setProfile(updatedProfile);
    // Optionally, trigger a reload of the auth user if fundamental details changed
    // This is more for immediate reflection if AuthContext doesn't pick it up fast enough.
    // reloadUser(); 
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
                         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
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
    </MainLayout>
  );
}
