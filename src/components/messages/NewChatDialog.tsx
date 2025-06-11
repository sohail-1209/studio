
// src/components/messages/NewChatDialog.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/shared/Spinner';
import { Search } from 'lucide-react';
import Image from 'next/image';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    if (open && currentUser) {
      setLoadingUsers(true);
      const profilesCollection = collection(db, 'profiles');
      const q = query(profilesCollection, where('uid', '!=', currentUser.uid));
      
      getDocs(q)
        .then((snapshot) => {
          const usersList = snapshot.docs.map(docSnap => docSnap.data() as UserProfile);
          setAllUsers(usersList);
        })
        .catch((error) => {
          console.error("Error fetching users for NewChatDialog:", error);
          toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    } else {
      setAllUsers([]);
      setSearchTerm('');
    }
  }, [open, currentUser, toast]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    return allUsers.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, searchTerm]);

  const handleSelectUser = async (selectedUser: UserProfile) => {
    if (!currentUser || !currentUser.uid) {
        toast({ title: "Authentication Error", description: "Current user not found. Please re-login.", variant: "destructive" });
        console.error("NewChatDialog: Current user or UID is missing.", currentUser);
        return;
    }
    if (!selectedUser || !selectedUser.uid) {
        toast({ title: "Error", description: "Selected user data is incomplete.", variant: "destructive" });
        console.error("NewChatDialog: Selected user or UID is missing.", selectedUser);
        return;
    }
    setIsCreatingChat(true);

    const chatId = [currentUser.uid, selectedUser.uid].sort().join('_');
    const chatDocRef = doc(db, 'chats', chatId);

    try {
      let chatSnap;
      try {
        chatSnap = await getDoc(chatDocRef);
      } catch (findError: any) {
        console.error("NewChatDialog: FirebaseError FINDING chat (getDoc):", findError);
        console.error("Error Code:", findError.code);
        console.error("Error Message:", findError.message);
        console.error("Error Details (if any):", findError.details);
        toast({ 
          title: "Chat Find Error", 
          description: `Could not check for existing chat: ${findError.message || 'Please try again.'}`, 
          variant: "destructive" 
        });
        setIsCreatingChat(false);
        return;
      }

      if (chatSnap.exists()) {
        console.log(`NewChatDialog: Chat with ID ${chatId} already exists. Navigating.`);
        router.push(`/messages/${chatId}`);
        onOpenChange(false); 
      } else {
        const newChatData = {
          userIds: [currentUser.uid, selectedUser.uid],
          userDetails: {
            [currentUser.uid]: {
              displayName: currentUser.displayName || 'Current User',
              photoURL: currentUser.photoURL || `https://placehold.co/40x40.png?text=${(currentUser.displayName || 'C').charAt(0)}`,
            },
            [selectedUser.uid]: {
              displayName: selectedUser.displayName || 'Selected User',
              photoURL: selectedUser.photoURL || `https://placehold.co/40x40.png?text=${(selectedUser.displayName || 'S').charAt(0)}`,
            },
          },
          lastMessageText: null,
          lastMessageSenderId: null,
          lastMessageTimestamp: null, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log('NewChatDialog: Pre-flight Data for New Chat Creation:');
        console.log('Current User UID:', currentUser.uid);
        console.log('Selected User UID:', selectedUser.uid);
        console.log('Generated Chat ID:', chatId);
        console.log('Data to be written (newChatData):', JSON.stringify(newChatData, null, 2));

        const clientSideRuleCheck = currentUser && currentUser.uid && newChatData.userIds.includes(currentUser.uid);
        console.log(`NewChatDialog: Client-side rule check (currentUser.uid in newChatData.userIds): ${clientSideRuleCheck ? 'PASSED' : 'FAILED'}`);

        if (!clientSideRuleCheck) {
          console.error("NewChatDialog: CRITICAL - Client-side rule check FAILED. currentUser.uid is not in newChatData.userIds. Aborting Firestore write.");
          toast({ 
            title: "Client Data Error", 
            description: "Could not prepare chat data correctly. Please report this issue.", 
            variant: "destructive" 
          });
          setIsCreatingChat(false);
          return;
        }
        console.log("NewChatDialog: Client-side rule check PASSED. Attempting Firestore write (setDoc)...");
        
        try {
          await setDoc(chatDocRef, newChatData);
          console.log(`NewChatDialog: Successfully created chat with ID ${chatId}. Navigating.`);
          router.push(`/messages/${chatId}`);
          onOpenChange(false);
        } catch (createError: any) {
          console.error("NewChatDialog: FirebaseError CREATING chat (setDoc):", createError);
          console.error("Error Code:", createError.code);
          console.error("Error Message:", createError.message);
          console.error("Error Details (if any):", createError.details);
          toast({ 
            title: "Chat Creation Error", 
            description: `Could not start chat: ${createError.message || 'Please try again.'}`, 
            variant: "destructive" 
          });
        }
      }
    } catch (error: any) {
      // This outer catch is unlikely to be hit if inner ones handle specific Firebase errors,
      // but it's good for unexpected issues.
      console.error("NewChatDialog: UNEXPECTED error in handleSelectUser:", error);
      toast({ 
        title: "Unexpected Error", 
        description: `An unexpected error occurred: ${error.message || 'Please try again.'}`, 
        variant: "destructive" 
      });
    } finally {
      setIsCreatingChat(false);
    }
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSearchTerm('');
    }
    onOpenChange(isOpen);
  };


  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>Select a user to start a conversation.</DialogDescription>
        </DialogHeader>
        
        <div className="relative mt-2 mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loadingUsers || isCreatingChat}
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loadingUsers && (
            <div className="flex justify-center items-center h-full">
              <Spinner size={32} />
            </div>
          )}
          {!loadingUsers && filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm ? "No users match your search." : "No users found."}
            </p>
          )}
          {!loadingUsers && filteredUsers.map((u) => (
            <div
              key={u.uid}
              className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
              onClick={() => !isCreatingChat && handleSelectUser(u)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && !isCreatingChat && handleSelectUser(u)}
            >
              <Avatar className="h-10 w-10">
                {u.photoURL ? (
                    <Image src={u.photoURL} alt={u.displayName || 'User'} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                ) : (
                    <AvatarFallback>{(u.displayName || u.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{u.displayName || 'Unnamed User'}</p>
                <p className="text-sm text-muted-foreground">@{u.username || u.uid.substring(0,6)}</p>
              </div>
            </div>
          ))}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isCreatingChat}>
              Cancel
            </Button>
          </DialogClose>
           {isCreatingChat && <Spinner className="ml-2" />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

