
// src/app/messages/[chatId]/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Paperclip, Send, Phone, Video, Smile } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState, use, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import type { ChatMessage, ChatMessageDocument, ChatSessionDocument, ChatSessionUserDetail } from '@/types/chat';
import { format } from 'date-fns'; 
import { Skeleton } from '@/components/ui/skeleton'; 
import { Spinner } from '@/components/shared/Spinner';
import Image from 'next/image';

export default function ChatPage({ params: paramsPromise }: { params: { chatId: string } }) {
  const params = use(paramsPromise); // Using use() for promise resolution
  const { chatId } = params;
  const { user } = useAuth();

  const [chatPartnerProfile, setChatPartnerProfile] = useState<ChatSessionUserDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false); 

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  useEffect(() => {
    if (!chatId || !user?.uid) {
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);

    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChatDetails = onSnapshot(chatDocRef, (chatSnap) => {
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as ChatSessionDocument;
        const otherUserId = chatData.userIds.find(uid => uid !== user.uid);

        if (otherUserId) {
          if (chatData.userDetails && chatData.userDetails[otherUserId]) {
            setChatPartnerProfile(chatData.userDetails[otherUserId]);
          } else {
            // Fallback: fetch profile if not denormalized (should ideally not happen if chats are created correctly)
            getDoc(doc(db, 'profiles', otherUserId)).then(profileDoc => {
              if (profileDoc.exists()) {
                const profileData = profileDoc.data();
                setChatPartnerProfile({
                  displayName: profileData?.displayName || 'User',
                  photoURL: profileData?.photoURL || `https://placehold.co/40x40.png?text=${(profileData?.displayName || 'U').charAt(0)}`,
                });
              } else {
                 setChatPartnerProfile({ displayName: 'Unknown User', photoURL: `https://placehold.co/40x40.png?text=?` });
              }
            });
          }
        } else {
           setChatPartnerProfile({ displayName: 'Group Chat', photoURL: `https://placehold.co/40x40.png?text=G` }); // Or handle as an error for 1:1
        }
      } else {
        console.error("Chat session not found!");
        setChatPartnerProfile({ displayName: 'Chat Not Found', photoURL: `https://placehold.co/40x40.png?text=E` });
      }
    }, (error) => {
        console.error("Error fetching chat details:", error);
        setChatPartnerProfile({ displayName: 'Error Loading', photoURL: `https://placehold.co/40x40.png?text=E` });
    });

    const messagesCollection = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));

    const unsubscribeMessages = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMessages = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
          } as ChatMessage;
        });
        setMessages(fetchedMessages);
        setLoadingMessages(false);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setLoadingMessages(false);
      }
    );

    return () => {
      unsubscribeChatDetails();
      unsubscribeMessages();
    };
  }, [chatId, user?.uid]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user?.uid || sendingMessage) return;

    setSendingMessage(true);

    const messageData: ChatMessageDocument = {
      senderId: user.uid,
      text: newMessage,
      timestamp: serverTimestamp(),
    };

    try {
      const batch = writeBatch(db);
      const messagesCollectionRef = collection(db, 'chats', chatId, 'messages');
      const newMessageRef = doc(messagesCollectionRef); 
      batch.set(newMessageRef, messageData);
      
      const chatDocRef = doc(db, 'chats', chatId);
      batch.update(chatDocRef, {
        lastMessageText: newMessage,
        lastMessageSenderId: user.uid,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const MessageSkeleton = () => (
    <div className="flex items-end space-x-2 my-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-10 w-3/5 rounded-lg" />
    </div>
  );


  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col">
        <header className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <Link href="/messages">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            {chatPartnerProfile ? (
              <>
                <Avatar>
                  {chatPartnerProfile.photoURL ? (
                    <Image src={chatPartnerProfile.photoURL} alt={chatPartnerProfile.displayName || 'User'} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                  ) : (
                    <AvatarFallback>{(chatPartnerProfile.displayName || 'U').charAt(0)}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{chatPartnerProfile.displayName}</p>
                </div>
              </>
            ) : (
              <>
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {loadingMessages && (
            <div className="space-y-4">
              <MessageSkeleton />
              <div className="flex justify-end"><MessageSkeleton /></div>
              <MessageSkeleton />
            </div>
          )}
          {!loadingMessages && (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end space-x-2",
                    msg.senderId === user?.uid ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.senderId !== user?.uid && chatPartnerProfile && (
                    <Avatar className="h-8 w-8 self-start">
                       {chatPartnerProfile.photoURL ? (
                        <Image src={chatPartnerProfile.photoURL} alt={chatPartnerProfile.displayName || 'Sender'} width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
                      ) : (
                        <AvatarFallback>{(chatPartnerProfile.displayName || "U").charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-xs rounded-lg p-3 lg:max-w-md shadow",
                      msg.senderId === user?.uid
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                    <p className={cn(
                        "mt-1 text-xs",
                        msg.senderId === user?.uid ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-right"
                      )}
                    >
                      {msg.timestamp ? format(msg.timestamp, 'p') : ''}
                    </p>
                  </div>
                </div>
              ))}
              {isPartnerTyping && chatPartnerProfile && ( 
                <div className="flex items-end space-x-2 justify-start">
                   <Avatar className="h-8 w-8 self-start">
                      {chatPartnerProfile.photoURL ? (
                        <Image src={chatPartnerProfile.photoURL} alt="Sender" width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
                       ) : (
                        <AvatarFallback>{(chatPartnerProfile.displayName || "U").charAt(0)}</AvatarFallback>
                       )}
                    </Avatar>
                  <div className="bg-muted text-foreground rounded-lg p-3 shadow">
                    <p className="text-sm italic">typing...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <footer className="border-t bg-card p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" type="button"><Smile className="h-5 w-5 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" type="button"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
            <Input
              type="text"
              placeholder="Type a message..."
              className="flex-1"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sendingMessage || loadingMessages}
            />
            <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90" disabled={sendingMessage || loadingMessages || newMessage.trim() === ''}>
              {sendingMessage ? <Spinner size={18} className="text-primary-foreground" /> : <Send className="h-5 w-5 text-primary-foreground" />}
            </Button>
          </form>
        </footer>
      </div>
    </MainLayout>
  );
}

