
// src/components/profile/FollowListDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UserProfile } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  users: UserProfile[];
  loading: boolean;
}

export function FollowListDialog({ open, onOpenChange, title, users, loading }: FollowListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          {!loading && <DialogDescription>Showing {users.length} user(s)</DialogDescription>}
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          {loading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No users to display in this list.
            </p>
          )}
          {!loading && users.map((user) => (
            <div
              key={user.uid}
              className="flex items-center space-x-3 p-2 -mx-2 hover:bg-muted/50 rounded-md transition-colors"
            >
              <Avatar className="h-10 w-10">
                {user.photoURL ? (
                    <Image src={user.photoURL} alt={user.displayName || 'User'} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                ) : (
                    <AvatarFallback>{(user.displayName || user.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${user.uid}`} className="group" onClick={() => onOpenChange(false)}>
                  <p className="font-semibold text-foreground truncate group-hover:underline">{user.displayName || 'Unnamed User'}</p>
                  <p className="text-sm text-muted-foreground truncate">@{user.username || user.uid.substring(0,6)}</p>
                </Link>
              </div>
              {/* Future: Add a follow/unfollow button here if needed */}
            </div>
          ))}
        </ScrollArea>
        
        <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
        >
            <X className="h-5 w-5" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
