// src/app/messages/page.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';

const placeholderChats = [
  { id: '1', name: 'Jane Doe', avatar: 'https://placehold.co/50x50.png?text=JD', lastMessage: 'Hey, how are you?', time: '10:30 AM', unread: 2 },
  { id: '2', name: 'John Smith', avatar: 'https://placehold.co/50x50.png?text=JS', lastMessage: 'See you tomorrow!', time: 'Yesterday', unread: 0 },
  { id: '3', name: 'Alice Brown', avatar: 'https://placehold.co/50x50.png?text=AB', lastMessage: 'Okay, sounds good.', time: 'Mon', unread: 1 },
  { id: '4', name: 'Bob Green', avatar: 'https://placehold.co/50x50.png?text=BG', lastMessage: 'Can you send me the file?', time: 'Sun', unread: 0 },
];

export default function MessagesPage() {
  return (
    <MainLayout>
      <div className="container mx-auto h-[calc(100vh-theme(spacing.24))] max-w-4xl py-8"> {/* Adjust height based on header/paddings */}
        <Card className="h-full flex flex-col shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline text-2xl">Messages</CardTitle>
              <Button variant="outline" size="icon">
                <MessageSquarePlus className="h-5 w-5" />
                <span className="sr-only">New Message</span>
              </Button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search messages or users..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {placeholderChats.map((chat) => (
                  <Link href={`/messages/${chat.id}`} key={chat.id} className="block hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4 p-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chat.avatar} alt={chat.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-semibold text-foreground">{chat.name}</p>
                          <p className="text-xs text-muted-foreground">{chat.time}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="truncate text-sm text-muted-foreground">{chat.lastMessage}</p>
                          {chat.unread > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
