
// src/app/messages/[chatId]/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Paperclip, Send, Phone, Video, Smile, XCircle, Trash2, Loader2, Users } from 'lucide-react'; // Added Users
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState, use, useRef, ChangeEvent, useCallback } from 'react';
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
  type FieldValue,
} from 'firebase/firestore';
import { ref as storageRefFirebase, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
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


const TYPING_TIMEOUT_MS = 3000;

interface ChatHeaderDetails {
  displayName: string | null;
  photoURL: string | null;
  isGroup: boolean;
  memberCount?: number; // For groups
}

export default function ChatPage({ params: paramsPromise }: { params: { chatId: string } }) {
  const params = use(paramsPromise);
  const { chatId } = params;
  const { user } = useAuth();
  const { toast } = useToast();

  const [chatHeaderDetails, setChatHeaderDetails] = useState<ChatHeaderDetails | null>(null);
  const [chatMembersDetails, setChatMembersDetails] = useState<{[key: string]: ChatSessionUserDetail}>({});

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [partnerTypingStatuses, setPartnerTypingStatuses] = useState<{[key: string]: boolean}>({});

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const [isDeleteMessageDialogOpen, setIsDeleteMessageDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIsTypingRef = useRef(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, partnerTypingStatuses]);


  const updateSelfTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!user?.uid || !chatId) return;
    currentUserIsTypingRef.current = isTyping;
    const chatDocRef = doc(db, 'chats', chatId);
    try {
      const chatSnap = await getDoc(chatDocRef);
      if (chatSnap.exists()) {
        await updateDoc(chatDocRef, {
          [`typing.${user.uid}`]: isTyping,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error updating self typing status:", error);
    }
  }, [user?.uid, chatId]);

  useEffect(() => {
    if (!user?.uid || !chatId) return;
    if (newMessage.trim() !== '') {
      if (!currentUserIsTypingRef.current) updateSelfTypingStatus(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => updateSelfTypingStatus(false), TYPING_TIMEOUT_MS);
    } else {
      if (currentUserIsTypingRef.current) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        updateSelfTypingStatus(false);
      }
    }
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [newMessage, user?.uid, chatId, updateSelfTypingStatus]);


  useEffect(() => {
    if (!chatId || !user?.uid) {
      setLoadingMessages(false);
      setChatHeaderDetails(null);
      return;
    }
    setLoadingMessages(true);
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChatDetails = onSnapshot(chatDocRef, (chatSnap) => {
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as ChatSessionDocument;
        setChatMembersDetails(chatData.userDetails || {});

        if (chatData.isGroupChat) {
          setChatHeaderDetails({
            displayName: chatData.groupName || 'Group Chat',
            photoURL: chatData.groupAvatarUrl || null, // Will use generic icon if null
            isGroup: true,
            memberCount: chatData.userIds.length,
          });
        } else {
          const otherUserId = chatData.userIds.find(uid => uid !== user.uid);
          if (otherUserId && chatData.userDetails && chatData.userDetails[otherUserId]) {
            setChatHeaderDetails({
              displayName: chatData.userDetails[otherUserId].displayName,
              photoURL: chatData.userDetails[otherUserId].photoURL,
              isGroup: false,
            });
          } else {
             // Fallback for 1:1 if userDetails somehow missing for partner
             setChatHeaderDetails({ displayName: 'Chat User', photoURL: null, isGroup: false });
          }
        }
        // Handle typing statuses for all partners (excluding self)
        const currentPartnerStatuses: {[key: string]: boolean} = {};
        if (chatData.typing) {
            for (const uid in chatData.typing) {
                if (uid !== user.uid && chatData.userIds.includes(uid)) {
                    currentPartnerStatuses[uid] = chatData.typing[uid];
                }
            }
        }
        setPartnerTypingStatuses(currentPartnerStatuses);

      } else {
        console.error("Chat session not found for ID:", chatId);
        setChatHeaderDetails({ displayName: 'Chat Not Found', photoURL: null, isGroup: false });
        setPartnerTypingStatuses({});
      }
    }, (error) => {
        console.error("Error fetching chat details:", error);
        setChatHeaderDetails({ displayName: 'Error Loading Chat', photoURL: null, isGroup: false });
        setPartnerTypingStatuses({});
    });

    const messagesCollection = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as ChatMessageDocument;
        const senderDetails = chatMembersDetails[data.senderId] || { displayName: "User", photoURL: null };
        return {
          id: docSnap.id, ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
          senderDisplayName: senderDetails.displayName,
          senderAvatar: senderDetails.photoURL,
        } as ChatMessage;
      });
      setMessages(fetchedMessages);
      setLoadingMessages(false);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setLoadingMessages(false);
    });
    return () => { unsubscribeChatDetails(); unsubscribeMessages(); };
  }, [chatId, user?.uid, chatMembersDetails]); // Added chatMembersDetails dependency for message enrichment

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Please select a file smaller than 10MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setNewMessage(''); 
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null); setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => setNewMessage((prev) => prev + emojiData.emoji);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user?.uid || sendingMessage) return;
    setSendingMessage(true); setUploadProgress(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateSelfTypingStatus(false);

    const batch = writeBatch(db);
    const newMessageRef = doc(collection(db, 'chats', chatId, 'messages'));
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
        const fileSgRef = storageRefFirebase(storage, filePath);
        const uploadTask = uploadBytesResumable(fileSgRef, selectedFile);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { reject(error); },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                messageData.imageUrl = downloadURL; messageData.imagePath = filePath;
                messageData.fileType = selectedFile.type; messageData.text = newMessage.trim() || null; 
                messageData.dataAiHint = "chat image"; resolve();
              } catch (urlError) { reject(urlError); }
            });
        });
      }
      batch.set(newMessageRef, messageData);
      const updatePayload: Partial<ChatSessionDocument> & { updatedAt: FieldValue, [key: string]: any } = {
        lastMessageText: messageData.imageUrl ? (messageData.text ? messageData.text : "📷 Image") : lastMessageText,
        lastMessageSenderId: user.uid, lastMessageTimestamp: serverTimestamp(), updatedAt: serverTimestamp(),
        [`typing.${user.uid}`]: false,
      };
      batch.update(chatDocRef, updatePayload);
      await batch.commit();
      setNewMessage(''); clearFileSelection();
    } catch (error: any) {
      toast({ title: 'Error Sending Message', description: error.message, variant: 'destructive' });
    } finally {
      setSendingMessage(false); setUploadProgress(null);
    }
  };

  const handleDeleteMessageRequest = (msg: ChatMessage) => { setMessageToDelete(msg); setIsDeleteMessageDialogOpen(true); };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !user || messageToDelete.senderId !== user.uid) {
      toast({ title: "Error", description: "Cannot delete this message.", variant: "destructive" });
      setIsDeleteMessageDialogOpen(false); setMessageToDelete(null); return;
    }
    setIsDeletingMessage(true);
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageToDelete.id);
      if (messageToDelete.imagePath) {
        await deleteObject(storageRefFirebase(storage, messageToDelete.imagePath)).catch(err => console.warn("Warn: Img delete fail", err));
      }
      await deleteDoc(messageRef);
      const currentMessages = messages.filter(m => m.id !== messageToDelete.id);
      if (currentMessages.length > 0) {
        const lastMsgInUI = currentMessages[currentMessages.length - 1];
        if (messageToDelete.timestamp >= (lastMsgInUI.timestamp || new Date(0))) { 
             await updateDoc(doc(db, 'chats', chatId), {
                lastMessageText: lastMsgInUI.imageUrl ? (lastMsgInUI.text ? lastMsgInUI.text : "📷 Image") : lastMsgInUI.text,
                lastMessageSenderId: lastMsgInUI.senderId, lastMessageTimestamp: serverTimestamp(), updatedAt: serverTimestamp(),
             });
        }
      } else { 
         await updateDoc(doc(db, 'chats', chatId), {
            lastMessageText: "🗑️ Message deleted", lastMessageSenderId: null, lastMessageTimestamp: serverTimestamp(), updatedAt: serverTimestamp(),
         });
      }
      toast({ title: "Message Deleted" });
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message || "Could not delete.", variant: "destructive" });
    } finally {
      setIsDeletingMessage(false); setIsDeleteMessageDialogOpen(false); setMessageToDelete(null);
    }
  };
  
  const callButtonsDisabled = !chatHeaderDetails || chatHeaderDetails.isGroup; // Disable for groups

  const typingPartners = Object.entries(partnerTypingStatuses)
    .filter(([_, isTyping]) => isTyping)
    .map(([uid, _]) => chatMembersDetails[uid]?.displayName || 'Someone');

  return (
    <MainLayout>
      <>
        <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col">
            <header className="flex items-center justify-between border-b bg-card p-4">
              <div className="flex items-center space-x-3 min-w-0">
                <Button variant="ghost" size="icon" asChild className="md:hidden flex-shrink-0">
                  <Link href="/messages"> <ArrowLeft className="h-5 w-5" /> </Link>
                </Button>
                {chatHeaderDetails ? (
                  <>
                    <Avatar className="flex-shrink-0">
                      {chatHeaderDetails.photoURL ? (
                        <Image src={chatHeaderDetails.photoURL} alt={chatHeaderDetails.displayName || 'Chat'} width={40} height={40} className="rounded-full" data-ai-hint={chatHeaderDetails.isGroup ? "group avatar" : "user avatar"} />
                      ) : chatHeaderDetails.isGroup ? (
                        <AvatarFallback className="bg-muted text-muted-foreground"><Users className="h-5 w-5" /></AvatarFallback>
                      ) : ( <AvatarFallback>{(chatHeaderDetails.displayName || 'U').charAt(0)}</AvatarFallback> )}
                    </Avatar>
                    <div className="min-w-0"> 
                      <p className="font-semibold text-foreground truncate">{chatHeaderDetails.displayName}</p> 
                      {chatHeaderDetails.isGroup && chatHeaderDetails.memberCount && (
                         <p className="text-xs text-muted-foreground truncate">{chatHeaderDetails.memberCount} members</p>
                      )}
                    </div>
                  </>
                ) : ( <> <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" /> <div className="space-y-1 min-w-0"> <Skeleton className="h-4 w-24" /> <Skeleton className="h-3 w-20" /> </div> </> )}
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <Button variant="ghost" size="icon" title="Voice Call (1-on-1 only)" disabled={callButtonsDisabled}><Phone className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" title="Video Call (1-on-1 only)" disabled={callButtonsDisabled}><Video className="h-5 w-5" /></Button>
              </div>
            </header>

            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {loadingMessages && ( <div className="space-y-4"> {[1,2,3].map(i=><div key={i} className={cn("flex items-end space-x-2 my-2", i%2===0 ? "justify-end":"justify-start")}><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-12 w-3/5 rounded-lg" /></div>)} </div> )}
              {!loadingMessages && (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const senderDetails = chatMembersDetails[msg.senderId];
                    const avatarUrl = msg.senderId === user?.uid ? user.photoURL : senderDetails?.photoURL;
                    const avatarFallback = msg.senderId === user?.uid 
                        ? (user.displayName || "U").charAt(0)
                        : (senderDetails?.displayName || "U").charAt(0);

                    return (
                    <div key={msg.id} className={cn("flex items-end space-x-2 group", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                      {msg.senderId !== user?.uid && (
                        <Avatar className="h-8 w-8 self-start flex-shrink-0">
                           {avatarUrl ? (
                            <Image src={avatarUrl} alt={senderDetails?.displayName || 'Sender'} width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
                          ) : ( <AvatarFallback>{avatarFallback}</AvatarFallback> )}
                        </Avatar>
                      )}
                      <div className={cn("max-w-xs rounded-lg p-2 lg:max-w-md shadow-md relative", msg.senderId === user?.uid ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none border border-border/10")}>
                        {msg.senderId !== user?.uid && chatHeaderDetails?.isGroup && (
                          <p className="text-xs font-medium mb-0.5" style={{color: `hsl(var(--${msg.senderId?.substring(0,5) % 5 + 1}))`}}>{senderDetails?.displayName || 'User'}</p>
                        )}
                        {msg.imageUrl ? (
                          <div className="space-y-1">
                            <Image src={msg.imageUrl} alt="Sent image" width={250} height={250} className="rounded max-w-full h-auto object-contain border border-border/5" data-ai-hint={msg.dataAiHint || "chat image"} />
                             {msg.text && <p className="text-sm whitespace-pre-wrap px-0.5">{msg.text}<span className={cn("ml-1.5 text-xs", msg.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground/80")}>{' '}{msg.timestamp ? format(msg.timestamp, 'p') : ''}</span></p>}
                             {!msg.text && <p className={cn("mt-1 text-xs text-right", msg.senderId === user?.uid ? "text-primary-foreground/80" : "text-muted-foreground")}>{msg.timestamp ? format(msg.timestamp, 'p') : ''}</p>}
                          </div>
                        ) : ( msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}<span className={cn("ml-1.5 text-xs", msg.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground/80")}>{' '}{msg.timestamp ? format(msg.timestamp, 'p') : ''}</span></p> )}
                         {msg.senderId === user?.uid && ( <Button variant="ghost" size="icon" className="absolute top-0.5 right-0.5 h-6 w-6 p-1 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" onClick={() => handleDeleteMessageRequest(msg)} title="Delete message" disabled={isDeletingMessage}> {isDeletingMessage && messageToDelete?.id === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 size={12} />} </Button> )}
                      </div>
                    </div>
                  )})}
                  {typingPartners.length > 0 && (
                    <div className="flex items-end space-x-2 justify-start">
                       {/* For groups, might need a generic typing indicator or list names */}
                       {!chatHeaderDetails?.isGroup && chatMembersDetails[typingPartners[0]] && ( // Show avatar only for 1:1 partner typing
                          <Avatar className="h-8 w-8 self-start flex-shrink-0">
                            {chatMembersDetails[typingPartners[0]]?.photoURL ? (
                              <Image src={chatMembersDetails[typingPartners[0]]?.photoURL!} alt={chatMembersDetails[typingPartners[0]]?.displayName || "Sender"} width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
                            ) : ( <AvatarFallback>{(chatMembersDetails[typingPartners[0]]?.displayName || "U").charAt(0)}</AvatarFallback> )}
                          </Avatar>
                       )}
                      <div className="bg-muted text-foreground rounded-lg p-2 shadow-md border border-border/10 rounded-tl-none"> 
                        <p className="text-sm italic">
                            {typingPartners.slice(0,2).join(', ')}
                            {typingPartners.length > 2 ? ` and ${typingPartners.length - 2} more` : ''}
                            {typingPartners.length === 1 ? ' is typing...' : ' are typing...'}
                        </p> 
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <footer className="border-t bg-card p-4">
              {filePreviewUrl && ( <div className="mb-2 p-2 border rounded-md relative bg-card shadow-sm"> <Image src={filePreviewUrl} alt="File preview" width={80} height={80} className="rounded object-contain border border-border/20" /> <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={clearFileSelection}><XCircle className="h-4 w-4" /></Button> {uploadProgress !== null && ( <Progress value={uploadProgress} className="w-full h-1.5 mt-1" /> )} </div> )}
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                  <PopoverTrigger asChild><Button variant="ghost" size="icon" type="button" title="Emoji" className="flex-shrink-0"><Smile className="h-5 w-5 text-muted-foreground" /></Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0"><EmojiPicker onEmojiClick={handleEmojiClick} autoFocusSearch={false} height={350} width="100%" theme={Theme.AUTO} lazyLoadEmojis /></PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={sendingMessage} className="flex-shrink-0"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" disabled={sendingMessage}/>
                <Input type="text" placeholder={selectedFile ? "Add a caption..." : "Type a message..."} className="flex-1" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={sendingMessage || (selectedFile && uploadProgress !== null && uploadProgress < 100)} />
                <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 flex-shrink-0" disabled={sendingMessage || (!newMessage.trim() && !selectedFile) || (selectedFile && uploadProgress !== null && uploadProgress < 100)}> {sendingMessage ? <Spinner size={18} className="text-primary-foreground" /> : <Send className="h-5 w-5 text-primary-foreground" />} </Button>
              </form>
            </footer>
          </div>
         {messageToDelete && ( <AlertDialog open={isDeleteMessageDialogOpen} onOpenChange={setIsDeleteMessageDialogOpen}> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Delete Message?</AlertDialogTitle> <AlertDialogDescription> This action cannot be undone. This will permanently delete this message. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setMessageToDelete(null)} disabled={isDeletingMessage}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteMessage} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingMessage}> {isDeletingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> )}
      </>
    </MainLayout>
  );
}
