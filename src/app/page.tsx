// src/app/page.tsx (Feed Page)
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Placeholder data for posts
const posts = [
  {
    id: '1',
    user: { name: 'Alice Wonderland', avatar: 'https://placehold.co/50x50.png?text=AW' },
    image: 'https://placehold.co/600x400.png',
    dataAiHint: 'landscape nature',
    caption: 'Beautiful day out! ☀️ #nature #adventure',
    likes: 120,
    comments: 15,
  },
  {
    id: '2',
    user: { name: 'Bob The Builder', avatar: 'https://placehold.co/50x50.png?text=BB' },
    video: 'https://placehold.co/600x400.png/000000/FFFFFF?text=Sample+Video', // Placeholder for video
    dataAiHint: 'city timelapse',
    caption: 'Working on a new project! 🛠️ #coding #development',
    likes: 250,
    comments: 30,
  },
   {
    id: '3',
    user: { name: 'Charlie Chaplin', avatar: 'https://placehold.co/50x50.png?text=CC' },
    caption: 'Just a thought for the day: "A day without laughter is a day wasted." Keep smiling folks! 😊 #quotes #positivity',
    likes: 90,
    comments: 12,
  },
];

export default function FeedPage() {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-headline text-3xl font-bold text-foreground">Feed</h1>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" />
            Create Post
          </Button>
        </div>

        {/* Placeholder for Stories */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Stories</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-4 overflow-x-auto p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-1">
                <Avatar className="h-16 w-16 rounded-full border-2 border-pink-500 p-0.5">
                  <AvatarImage
                    src={`https://placehold.co/64x64.png/7E57C2/FFFFFF?text=U${i+1}`}
                    alt={`User ${i+1} story`}
                    data-ai-hint="portrait person"
                  />
                  <AvatarFallback>{`U`}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">User {i+1}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-8">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden shadow-lg">
              <CardHeader className="p-4">
                <div className="flex items-center space-x-3">
                  <Image src={post.user.avatar} alt={post.user.name} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                  <div>
                    <p className="font-semibold text-foreground">{post.user.name}</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p> {/* Placeholder timestamp */}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {post.image && (
                  <div className="relative aspect-video w-full">
                    <Image src={post.image} alt="Post image" layout="fill" objectFit="cover" data-ai-hint={post.dataAiHint} />
                  </div>
                )}
                {post.video && (
                   <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                     <Image src={post.video} alt="Post video placeholder" layout="fill" objectFit="contain" data-ai-hint={post.dataAiHint} />
                      {/* In a real app, you'd use a <video> tag or a video player component */}
                   </div>
                )}
                <div className="p-4">
                  <p className="mb-4 text-foreground">{post.caption}</p>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <Button variant="ghost" size="sm">Likes ({post.likes})</Button>
                    <Button variant="ghost" size="sm">Comments ({post.comments})</Button>
                    <Button variant="ghost" size="sm">Share</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
