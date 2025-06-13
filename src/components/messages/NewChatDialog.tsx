
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, doc, setDoc, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/shared/Spinner';
import { Search, Users, CheckCircle, Circle } from 'lucide-react';
import Image from 'next/image';
import type { ChatSessionDocument } from '@/types/chat';
import { cn } from '@/lib/utils';

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

  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (open && currentUser) {
      setLoadingUsers(true);
      const profilesCollection = collection(db, 'profiles');
      // Fetch all users except the current one
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
      // Reset states when dialog closes or if no current user
      setAllUsers([]);
      setSearchTerm('');
      setIsGroupMode(false);
      setGroupName('');
      setSelectedUsersForGroup([]);
    }
  }, [open, currentUser, toast]);

  const filteredUsers = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) return allUsers;
    return allUsers.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(lowerSearchTerm) || // Changed to includes for better search
        u.username?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allUsers, searchTerm]);

  const toggleUserSelectionForGroup = (user: UserProfile) => {
    setSelectedUsersForGroup((prevSelected) =>
      prevSelected.find((su) => su.uid === user.uid)
        ? prevSelected.filter((su) => su.uid !== user.uid)
        : [...prevSelected, user]
    );
  };

  const handleInitiateChat = async (selectedUserForOneOnOne?: UserProfile) => {
    if (!currentUser || !currentUser.uid) {
        toast({ title: "Authentication Error", description: "Current user not found.", variant: "destructive" });
        return;
    }
    setIsCreatingChat(true);

    try {
      if (isGroupMode) {
        if (!groupName.trim()) {
          toast({ title: "Group Name Required", description: "Please enter a name for your group.", variant: "destructive" });
          setIsCreatingChat(false);
          return;
        }
        if (selectedUsersForGroup.length === 0) {
          toast({ title: "Select Members", description: "Please select at least one member for the group.", variant: "destructive" });
          setIsCreatingChat(false);
          return;
        }

        const groupMemberUids = [currentUser.uid, ...selectedUsersForGroup.map(u => u.uid)];
        const groupUserDetails: { [key: string]: { displayName: string | null; photoURL: string | null } } = {};
        
        groupUserDetails[currentUser.uid] = {
            displayName: currentUser.displayName || 'Me',
            photoURL: currentUser.photoURL || `https://placehold.co/40x40.png?text=M`
        };
        selectedUsersForGroup.forEach(u => {
            groupUserDetails[u.uid] = {
                displayName: u.displayName || 'User',
                photoURL: u.photoURL || `https://placehold.co/40x40.png?text=${(u.displayName || 'U').charAt(0)}`
            };
        });

        const newGroupChatData: ChatSessionDocument = {
          userIds: groupMemberUids,
          userDetails: groupUserDetails,
          isGroupChat: true,
          groupName: groupName.trim(),
          // groupAvatarUrl: null, // Can add UI to set this later
          lastMessageText: "Group created",
          lastMessageSenderId: null, // System message effectively
          lastMessageTimestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          typing: groupMemberUids.reduce((acc, uid) => ({ ...acc, [uid]: false }), {}),
        };
        const newChatRef = await addDoc(collection(db, 'chats'), newGroupChatData);
        router.push(`/messages/${newChatRef.id}`);
        toast({ title: "Group Created!", description: `Group "${groupName.trim()}" has been created.`});

      } else { // 1-on-1 chat
        if (!selectedUserForOneOnOne || !selectedUserForOneOnOne.uid) {
          toast({ title: "Error", description: "No user selected for chat.", variant: "destructive" });
          setIsCreatingChat(false);
          return;
        }
        const chatId = [currentUser.uid, selectedUserForOneOnOne.uid].sort().join('_');
        const chatDocRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatDocRef);

        if (chatSnap.exists()) {
          router.push(`/messages/${chatId}`);
        } else {
          const newChatData: ChatSessionDocument = {
            userIds: [currentUser.uid, selectedUserForOneOnOne.uid],
            userDetails: {
              [currentUser.uid]: {
                displayName: currentUser.displayName || 'Current User',
                photoURL: currentUser.photoURL || `https://placehold.co/40x40.png?text=${(currentUser.displayName || 'C').charAt(0)}`,
              },
              [selectedUserForOneOnOne.uid]: {
                displayName: selectedUserForOneOnOne.displayName || 'Selected User',
                photoURL: selectedUserForOneOnOne.photoURL || `https://placehold.co/40x40.png?text=${(selectedUserForOneOnOne.displayName || 'S').charAt(0)}`,
              },
            },
            isGroupChat: false,
            lastMessageText: null,
            lastMessageSenderId: null,
            lastMessageTimestamp: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            typing: {
              [currentUser.uid]: false,
              [selectedUserForOneOnOne.uid]: false,
            },
          };
          await setDoc(chatDocRef, newChatData);
          router.push(`/messages/${chatId}`);
        }
      }
      onOpenChange(false); // Close dialog on success
    } catch (error: any) {
      console.error("Error initiating chat:", error);
      toast({ title: "Error", description: `Could not start chat: ${error.message}`, variant: "destructive" });
    } finally {
      setIsCreatingChat(false);
    }
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset all states when dialog is closed
      setSearchTerm('');
      setIsGroupMode(false);
      setGroupName('');
      setSelectedUsersForGroup([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isGroupMode ? 'Create New Group Chat' : 'New Message'}</DialogTitle>
          <DialogDescription>
            {isGroupMode ? 'Select members and name your group.' : 'Select a user to start a 1-on-1 conversation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-2 border-b mb-2">
          <Label htmlFor="group-mode-switch" className="text-sm font-medium">
            {isGroupMode ? "Group Chat Mode" : "1-on-1 Chat Mode"}
          </Label>
          <Switch
            id="group-mode-switch"
            checked={isGroupMode}
            onCheckedChange={setIsGroupMode}
            disabled={isCreatingChat}
          />
        </div>

        {isGroupMode && (
          <div className="space-y-2 mb-3">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={isCreatingChat}
            />
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name or username..."
            className="pl-10 mb-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loadingUsers || isCreatingChat}
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loadingUsers && (
            <div className="flex justify-center items-center h-full"> <Spinner size={32} /> </div>
          )}
          {!loadingUsers && filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm ? "No users match your search." : "No users found."}
            </p>
          )}
          {!loadingUsers && filteredUsers.map((u) => {
            const isSelectedForGroup = isGroupMode && selectedUsersForGroup.some(su => su.uid === u.uid);
            return (
            <div
              key={u.uid}
              className={cn(
                "flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-md cursor-pointer transition-colors",
                isSelectedForGroup && "bg-primary/10"
              )}
              onClick={() => !isCreatingChat && (isGroupMode ? toggleUserSelectionForGroup(u) : handleInitiateChat(u))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && !isCreatingChat && (isGroupMode ? toggleUserSelectionForGroup(u) : handleInitiateChat(u))}
            >
              <Avatar className="h-10 w-10">
                {u.photoURL ? (
                    <Image src={u.photoURL} alt={u.displayName || 'User'} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                ) : (
                    <AvatarFallback>{(u.displayName || u.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{u.displayName || 'Unnamed User'}</p>
                <p className="text-sm text-muted-foreground">@{u.username || u.uid.substring(0,6)}</p>
              </div>
              {isGroupMode && (
                isSelectedForGroup 
                  ? <CheckCircle className="h-5 w-5 text-primary" /> 
                  : <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          )})}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isCreatingChat}> Cancel </Button>
          </DialogClose>
          {isGroupMode && (
            <Button 
              type="button" 
              onClick={() => handleInitiateChat()} 
              disabled={isCreatingChat || !groupName.trim() || selectedUsersForGroup.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isCreatingChat ? <Spinner className="mr-2 h-4 w-4" /> : null} Create Group
            </Button>
          )}
           {isCreatingChat && !isGroupMode && <Spinner className="ml-2" />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
