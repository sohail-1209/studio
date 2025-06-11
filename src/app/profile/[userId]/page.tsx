// src/app/profile/[userId]/page.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, MessageCircle, MoreHorizontal, Edit3 } from 'lucide-react';
import Image from 'next/image';

// This is a placeholder. In a real app, you'd fetch this data.
// For now, we assume the userId is passed and we might use it if we had a backend call.
export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const { userId } = params;

  // Placeholder user data
  const userProfile = {
    name: "User " + userId.substring(0,5), // Display part of ID for uniqueness
    username: "@user" + userId.substring(0,5),
    avatar: `https://placehold.co/128x128.png?text=${userId.charAt(0).toUpperCase()}`,
    bio: "This is a sample bio for the user. Sharing my journey and connecting with amazing people!",
    followers: Math.floor(Math.random() * 1000),
    following: Math.floor(Math.random() * 500),
    postsCount: Math.floor(Math.random() * 100),
    isOwnProfile: userId === "me", // Example, in real app, compare with logged in user's ID
  };

  const placeholderPosts = Array.from({ length: 9 }).map((_, i) => ({
    id: `post-${i}`,
    imageUrl: `https://placehold.co/300x300.png?text=Post${i+1}`,
    aiHint: "abstract art"
  }));

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-muted/30 p-0">
            <div className="relative h-48 w-full">
              <Image src="https://placehold.co/1200x300.png" alt="Cover photo" layout="fill" objectFit="cover" data-ai-hint="abstract background" />
              <div className="absolute -bottom-16 left-8">
                <Avatar className="h-32 w-32 border-4 border-card shadow-md">
                  <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="profile picture" />
                  <AvatarFallback>{userProfile.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="pt-20 px-8 pb-6 flex justify-between items-end">
              <div>
                <h1 className="font-headline text-3xl font-bold text-foreground">{userProfile.name}</h1>
                <p className="text-sm text-muted-foreground">{userProfile.username}</p>
              </div>
              <div className="flex space-x-2">
                {userProfile.isOwnProfile ? (
                  <Button variant="outline"><Edit3 className="mr-2 h-4 w-4" />Edit Profile</Button>
                ) : (
                  <>
                    <Button><UserPlus className="mr-2 h-4 w-4" />Follow</Button>
                    <Button variant="outline"><MessageCircle className="mr-2 h-4 w-4" />Message</Button>
                  </>
                )}
                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-foreground mb-6">{userProfile.bio}</p>
            <div className="flex space-x-6 text-sm text-muted-foreground mb-8">
              <span><strong className="text-foreground">{userProfile.postsCount}</strong> Posts</span>
              <span><strong className="text-foreground">{userProfile.followers}</strong> Followers</span>
              <span><strong className="text-foreground">{userProfile.following}</strong> Following</span>
            </div>

            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="likes">Likes</TabsTrigger>
              </TabsList>
              <TabsContent value="posts">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                  {placeholderPosts.map(post => (
                    <div key={post.id} className="aspect-square relative rounded-md overflow-hidden">
                       <Image src={post.imageUrl} alt={`Post ${post.id}`} layout="fill" objectFit="cover" data-ai-hint={post.aiHint} />
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="media">
                <p className="text-center text-muted-foreground py-8">No media to display yet.</p>
              </TabsContent>
              <TabsContent value="likes">
                 <p className="text-center text-muted-foreground py-8">No liked posts to display yet.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
