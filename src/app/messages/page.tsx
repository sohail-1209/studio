
// src/app/messages/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquarePlus, Users } from 'lucide-react'; // Added Users icon
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { ChatSession, ChatSessionDocument, ChatSessionUserDetail } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { NewChatDialog } from '@/components/messages/NewChatDialog';
import Image from 'next/image';

export default function MessagesPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const chatsCollection = collection(db, 'chats');
    const q = query(
      chatsCollection,
      where('userIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const fetchedChats: ChatSession[] = await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data() as ChatSessionDocument;
            let otherUserDetails: (ChatSessionUserDetail & { uid: string }) | undefined = undefined;
            
            if (!data.isGroupChat) {
              const otherUserId = data.userIds.find(uid => uid !== user.uid);
              if (otherUserId) {
                if (data.userDetails && data.userDetails[otherUserId]) {
                   otherUserDetails = {
                      ...data.userDetails[otherUserId],
                      uid: otherUserId,
                   }
                } else {
                  const profileDoc = await getDoc(doc(db, 'profiles', otherUserId));
                  if (profileDoc.exists()) {
                    const profileData = profileDoc.data();
                    otherUserDetails = {
                      uid: otherUserId,
                      displayName: profileData?.displayName || 'User',
                      photoURL: profileData?.photoURL || `https://placehold.co/50x50.png?text=${(profileData?.displayName || 'U').charAt(0)}`,
                    };
                  }
                }
              }
            }

            return {
              id: docSnapshot.id,
              ...data,
              lastMessageTimestamp: data.lastMessageTimestamp instanceof Timestamp ? data.lastMessageTimestamp.toDate() : null,
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
              otherUser: otherUserDetails, // Will be undefined for group chats
              isGroupChat: data.isGroupChat || false,
              groupName: data.groupName || 'Group Chat',
              groupAvatarUrl: data.groupAvatarUrl || null,
            } as ChatSession;
          })
        );
        setChats(fetchedChats);
        setLoadingChats(false);
      },
      (error) => {
        console.error('Error fetching chats:', error);
        setLoadingChats(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredChats = chats.filter(chat => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (chat.isGroupChat) {
        return chat.groupName?.toLowerCase().includes(lowerSearchTerm) ||
               chat.lastMessageText?.toLowerCase().includes(lowerSearchTerm);
    }
    return chat.otherUser?.displayName?.toLowerCase().includes(lowerSearchTerm) ||
           chat.lastMessageText?.toLowerCase().includes(lowerSearchTerm);
  });

  const ChatListItemSkeleton = () => (
    <div className="flex items-center space-x-4 p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/5" />
        </div>
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="h-[calc(100vh-theme(spacing.24))] w-full">
          <Card className="h-full flex flex-col shadow-lg w-full">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline text-2xl">Messages</CardTitle>
                <Button variant="outline" size="icon" onClick={() => setIsNewChatDialogOpen(true)} className="flex-shrink-0">
                  <MessageSquarePlus className="h-5 w-5" />
                  <span className="sr-only">New Message</span>
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search messages, users, or groups..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingChats && (
                  <div className="divide-y">
                    <ChatListItemSkeleton /> <ChatListItemSkeleton /> <ChatListItemSkeleton />
                  </div>
                )}
                {!loadingChats && filteredChats.length === 0 && (
                   <div className="p-8 text-center text-muted-foreground">
                      No chats found. Start a new conversation!
                   </div>
                )}
                {!loadingChats && filteredChats.length > 0 && (
                  <div className="divide-y">
                    {filteredChats.map((chat) => (
                      <Link href={`/messages/${chat.id}`} key={chat.id} className="block hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4 p-4">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            {chat.isGroupChat ? (
                              chat.groupAvatarUrl ? (
                                <Image src={chat.groupAvatarUrl} alt={chat.groupName || 'Group'} width={48} height={48} className="rounded-full" data-ai-hint="group avatar" />
                              ) : (
                                <AvatarFallback className="bg-muted text-muted-foreground">
                                  <Users className="h-6 w-6" />
                                </AvatarFallback>
                              )
                            ) : chat.otherUser?.photoURL ? (
                               <Image src={chat.otherUser.photoURL} alt={chat.otherUser?.displayName || 'User'} width={48} height={48} className="rounded-full" data-ai-hint="user avatar" />
                            ) : (
                               <AvatarFallback>{(chat.otherUser?.displayName || 'U').charAt(0)}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="truncate font-semibold text-foreground">
                                {chat.isGroupChat ? chat.groupName : (chat.otherUser?.displayName || 'Unnamed Chat')}
                              </p>
                              {chat.lastMessageTimestamp && (
                                <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {formatDistanceToNow(chat.lastMessageTimestamp, { addSuffix: true })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="truncate text-sm text-muted-foreground">{chat.lastMessageText || 'No messages yet'}</p>
                              {/* Placeholder for unread count */}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        <NewChatDialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen} />
      </div>
    </MainLayout>
  );
}
