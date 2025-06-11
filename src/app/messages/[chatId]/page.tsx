
// src/app/messages/[chatId]/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Paperclip, Send, Phone, Video, Smile, XCircle, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState, use, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
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
  deleteDoc,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { ChatMessage, ChatMessageDocument, ChatSessionDocument, ChatSessionUserDetail } from '@/types/chat';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/shared/Spinner';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { Theme } from 'emoji-picker-react';
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


export default function ChatPage({ params: paramsPromise }: { params: { chatId: string } }) {
  const params = use(paramsPromise);
  const { chatId } = params;
  const { user } = useAuth();
  const { toast } = useToast();

  const [chatPartnerProfile, setChatPartnerProfile] = useState<ChatSessionUserDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false); 

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const [isDeleteMessageDialogOpen, setIsDeleteMessageDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
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
        if (otherUserId && chatData.userDetails && chatData.userDetails[otherUserId]) {
          setChatPartnerProfile(chatData.userDetails[otherUserId]);
        } else if (otherUserId) {
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
        } else {
           setChatPartnerProfile({ displayName: 'Group Chat', photoURL: `https://placehold.co/40x40.png?text=G` });
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
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id, ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
        } as ChatMessage;
      });
      setMessages(fetchedMessages);
      setLoadingMessages(false);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setLoadingMessages(false);
    });
    return () => { unsubscribeChatDetails(); unsubscribeMessages(); };
  }, [chatId, user?.uid]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File Too Large", description: "Please select a file smaller than 10MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file (PNG, JPG, GIF).", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setNewMessage(''); 
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prevMessage) => prevMessage + emojiData.emoji);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user?.uid || sendingMessage) return;

    setSendingMessage(true);
    setUploadProgress(null);

    const batch = writeBatch(db);
    const messagesCollectionRef = collection(db, 'chats', chatId, 'messages');
    const newMessageRef = doc(messagesCollectionRef);
    const chatDocRef = doc(db, 'chats', chatId);
    let lastMessageText = newMessage.trim();

    try {
      let messageData: ChatMessageDocument = {
        senderId: user.uid,
        text: newMessage.trim() || null,
        timestamp: serverTimestamp(),
      };

      if (selectedFile) {
        setUploadProgress(0);
        lastMessageText = `${user.displayName || 'User'} sent an image.`;
        const uniqueFileName = `${Date.now()}-${selectedFile.name}`;
        const filePath = `chat_images/${chatId}/${user.uid}/${uniqueFileName}`;
        const fileSgRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileSgRef, selectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error('Upload failed:', error);
              toast({ title: 'Image Upload Failed', description: error.message, variant: 'destructive' });
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                messageData.imageUrl = downloadURL;
                messageData.imagePath = filePath;
                messageData.fileType = selectedFile.type;
                messageData.text = newMessage.trim() || null; 
                messageData.dataAiHint = "chat image";
                resolve();
              } catch (urlError) {
                reject(urlError);
              }
            }
          );
        });
      }

      batch.set(newMessageRef, messageData);
      batch.update(chatDocRef, {
        lastMessageText: messageData.imageUrl ? (messageData.text ? messageData.text : "📷 Image") : lastMessageText,
        lastMessageSenderId: user.uid,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      setNewMessage('');
      clearFileSelection();

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ title: 'Error Sending Message', description: error.message, variant: 'destructive' });
    } finally {
      setSendingMessage(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteMessageRequest = (msg: ChatMessage) => {
    setMessageToDelete(msg);
    setIsDeleteMessageDialogOpen(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !user || messageToDelete.senderId !== user.uid) {
      toast({ title: "Error", description: "Cannot delete this message.", variant: "destructive" });
      setIsDeleteMessageDialogOpen(false);
      setMessageToDelete(null);
      return;
    }

    setIsDeletingMessage(true);
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageToDelete.id);
      
      if (messageToDelete.imagePath) {
        const imageFileRef = storageRef(storage, messageToDelete.imagePath);
        await deleteObject(imageFileRef).catch(storageError => {
          console.warn("Error deleting image from storage:", storageError);
          toast({ title: "Storage Warning", description: "Could not delete image file from storage.", variant: "default", duration: 4000 });
        });
      }

      await deleteDoc(messageRef);

      const currentMessages = messages.filter(m => m.id !== messageToDelete.id);
      if (currentMessages.length > 0) {
        const lastMsgInUI = currentMessages[currentMessages.length - 1];
        if (messageToDelete.timestamp >= (lastMsgInUI.timestamp || new Date(0))) { 
             const chatDocRef = doc(db, 'chats', chatId);
             await updateDoc(chatDocRef, {
                lastMessageText: lastMsgInUI.imageUrl ? (lastMsgInUI.text ? lastMsgInUI.text : "📷 Image") : lastMsgInUI.text,
                lastMessageSenderId: lastMsgInUI.senderId,
                lastMessageTimestamp: serverTimestamp(), 
                updatedAt: serverTimestamp(),
             });
        }
      } else { 
         const chatDocRef = doc(db, 'chats', chatId);
         await updateDoc(chatDocRef, {
            lastMessageText: "🗑️ Message deleted",
            lastMessageSenderId: null,
            lastMessageTimestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
         });
      }

      toast({ title: "Message Deleted", description: "The message has been removed." });
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({ title: "Deletion Failed", description: error.message || "Could not delete message.", variant: "destructive" });
    } finally {
      setIsDeletingMessage(false);
      setIsDeleteMessageDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const MessageSkeleton = () => (
    <div className="flex items-end space-x-2 my-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-12 w-3/5 rounded-lg" />
    </div>
  );

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col">
        <header className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <Link href="/messages"> <ArrowLeft className="h-5 w-5" /> </Link>
            </Button>
            {chatPartnerProfile ? (
              <>
                <Avatar>
                  {chatPartnerProfile.photoURL ? (
                    <Image src={chatPartnerProfile.photoURL} alt={chatPartnerProfile.displayName || 'User'} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                  ) : ( <AvatarFallback>{(chatPartnerProfile.displayName || 'U').charAt(0)}</AvatarFallback> )}
                </Avatar>
                <div> <p className="font-semibold text-foreground">{chatPartnerProfile.displayName}</p> </div>
              </>
            ) : (
              <>
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1"> <Skeleton className="h-4 w-24" /> </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" title="Voice Call (coming soon)"><Phone className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" title="Video Call (coming soon)"><Video className="h-5 w-5" /></Button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {loadingMessages && (
            <div className="space-y-4"> <MessageSkeleton /> <div className="flex justify-end"><MessageSkeleton /></div> <MessageSkeleton /> </div>
          )}
          {!loadingMessages && (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex items-end space-x-2 group", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                  {msg.senderId !== user?.uid && chatPartnerProfile && (
                    <Avatar className="h-8 w-8 self-start">
                       {chatPartnerProfile.photoURL ? (
                        <Image src={chatPartnerProfile.photoURL} alt={chatPartnerProfile.displayName || 'Sender'} width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
                      ) : ( <AvatarFallback>{(chatPartnerProfile.displayName || "U").charAt(0)}</AvatarFallback> )}
                    </Avatar>
                  )}
                  <div 
                    className={cn(
                      "max-w-xs rounded-lg p-2 lg:max-w-md shadow-md relative", 
                      msg.senderId === user?.uid 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none border border-border/10"
                    )}
                  >
                    {msg.imageUrl ? (
                      <div className="space-y-1">
                        <Image 
                          src={msg.imageUrl} 
                          alt="Sent image" 
                          width={250} 
                          height={250} 
                          className="rounded max-w-full h-auto object-contain border border-border/10" 
                          data-ai-hint={msg.dataAiHint || "chat image"} 
                        />
                         {msg.text ? (
                            <p className="text-sm whitespace-pre-wrap px-0.5">
                              {msg.text}
                              <span className={cn(
                                "ml-1.5 text-xs",
                                msg.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground/80"
                              )}>
                                {' '}{msg.timestamp ? format(msg.timestamp, 'p') : ''}
                              </span>
                            </p>
                          ) : (
                            <p 
                              className={cn(
                                "mt-1 text-xs text-right", 
                                msg.senderId === user?.uid ? "text-primary-foreground/80" : "text-muted-foreground"
                              )}
                            >
                              {msg.timestamp ? format(msg.timestamp, 'p') : ''}
                            </p>
                          )}
                      </div>
                    ) : (
                       msg.text && (
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.text}
                          <span className={cn(
                            "ml-1.5 text-xs",
                            msg.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground/80"
                          )}>
                            {' '}{msg.timestamp ? format(msg.timestamp, 'p') : ''}
                          </span>
                        </p>
                       )
                    )}
                     {msg.senderId === user?.uid && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-0.5 right-0.5 h-6 w-6 p-1 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                          onClick={() => handleDeleteMessageRequest(msg)}
                          title="Delete message"
                          disabled={isDeletingMessage}
                        >
                          {isDeletingMessage && messageToDelete?.id === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 size={12} />}
                        </Button>
                      )}
                  </div>
                </div>
              ))}
              {isPartnerTyping && chatPartnerProfile && (
                <div className="flex items-end space-x-2 justify-start">
                   <Avatar className="h-8 w-8 self-start">
                      {chatPartnerProfile.photoURL ? (
                        <Image src={chatPartnerProfile.photoURL} alt="Sender" width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
                       ) : ( <AvatarFallback>{(chatPartnerProfile.displayName || "U").charAt(0)}</AvatarFallback> )}
                    </Avatar>
                  <div className="bg-muted text-foreground rounded-lg p-2 shadow-md border border-border/10 rounded-tl-none"> 
                    <p className="text-sm italic">typing...</p> 
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <footer className="border-t bg-card p-4">
          {filePreviewUrl && (
            <div className="mb-2 p-2 border rounded-md relative bg-card shadow-sm">
              <Image src={filePreviewUrl} alt="File preview" width={80} height={80} className="rounded object-contain" />
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={clearFileSelection}>
                <XCircle className="h-4 w-4" />
              </Button>
              {uploadProgress !== null && (
                <Progress value={uploadProgress} className="w-full h-1.5 mt-1" />
              )}
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" type="button" title="Emoji">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-0">
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick} 
                  autoFocusSearch={false}
                  height={350}
                  width="100%"
                  theme={Theme.AUTO}
                  lazyLoadEmojis
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={sendingMessage}>
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" disabled={sendingMessage}/>
            <Input
              type="text"
              placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
              className="flex-1"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sendingMessage || (selectedFile && uploadProgress !== null && uploadProgress < 100)}
            />
            <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90" disabled={sendingMessage || (!newMessage.trim() && !selectedFile) || (selectedFile && uploadProgress !== null && uploadProgress < 100)}>
              {sendingMessage ? <Spinner size={18} className="text-primary-foreground" /> : <Send className="h-5 w-5 text-primary-foreground" />}
            </Button>
          </form>
        </footer>
      </div>
       {messageToDelete && (
        <AlertDialog open={isDeleteMessageDialogOpen} onOpenChange={setIsDeleteMessageDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this message.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMessageToDelete(null)} disabled={isDeletingMessage}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteMessage} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingMessage}>
                {isDeletingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </MainLayout>
  );
}

