// src/components/stories/StoryViewerDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import type { Post } from '@/types/post';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@/components/shared/Spinner';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Note: The AlertDialog for delete confirmation will be managed by the parent (FeedPage) for simplicity
// or we can pass a specific onDelete function for the currently viewed story.

interface StoryViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stories: Post[];
  author: {
    userId: string;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  loadingStories: boolean;
  onDeleteStory: (story: Post) => void; // Callback to request deletion
}

export function StoryViewerDialog({ open, onOpenChange, stories, author, loadingStories, onDeleteStory }: StoryViewerDialogProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    setCurrentStoryIndex(0);
  }, [open, stories, author]);

  const currentStory = stories[currentStoryIndex];
  const isOwnStory = currentUser?.uid === author?.userId;

  const goToNextStory = () => {
    setCurrentStoryIndex((prevIndex) => Math.min(prevIndex + 1, stories.length - 1));
  };

  const goToPreviousStory = () => {
    setCurrentStoryIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleDialogClose = () => {
    onOpenChange(false);
  };

  const handleDeleteClick = () => {
    if (currentStory && isOwnStory) {
      onDeleteStory(currentStory);
      // Dialog might close or show next story depending on parent's logic
      // For simplicity, we assume parent handles closing or navigating after deletion.
      // If there are no more stories, parent should close the dialog.
      if (stories.length === 1) { // If it was the last story
        onOpenChange(false);
      } else if (currentStoryIndex >= stories.length -1) { // If deleting the last story in a list
        setCurrentStoryIndex(Math.max(0, stories.length - 2));
      }
      // else currentStoryIndex remains, next story will show. Parent re-fetches/filters list.
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 gap-0 !rounded-lg overflow-hidden aspect-[9/16] max-h-[90vh] flex flex-col bg-black">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent flex flex-row justify-between items-center">
          <div className="flex items-center space-x-2">
            {author && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={author.photoURL || undefined} alt={author.displayName || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{(author.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <DialogTitle className="text-sm font-semibold text-white">
                {loadingStories ? "Loading..." : (author?.displayName || "Story")}
              </DialogTitle>
              {!loadingStories && currentStory && author && (
                <p className="text-xs text-gray-300">
                  {currentStory.createdAt ? formatDistanceToNow(currentStory.createdAt, { addSuffix: true }) : ''}
                </p>
              )}
            </div>
          </div>
           {isOwnStory && currentStory && !loadingStories && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DialogHeader>

        <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden pt-[60px]">
          {loadingStories && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
              <Spinner size={48} className="text-white" />
            </div>
          )}
          {!loadingStories && currentStory && author && (
            <>
              {currentStory.imageUrl && (
                <Image
                  src={currentStory.imageUrl}
                  alt={currentStory.caption || 'Story image'}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="max-h-full"
                  data-ai-hint={currentStory.dataAiHint || "story content"}
                  priority
                />
              )}
              {currentStory.videoUrl && (
                 <Image 
                    src={currentStory.videoUrl} 
                    alt={currentStory.caption || "Story video placeholder"} 
                    fill 
                    style={{objectFit: 'contain'}} 
                    data-ai-hint={currentStory.dataAiHint || "story content video"}
                 />
              )}
              {!currentStory.imageUrl && !currentStory.videoUrl && currentStory.caption && (
                <div className="p-8 text-white text-center text-xl flex items-center justify-center h-full">
                  <p className="whitespace-pre-wrap">{currentStory.caption}</p>
                </div>
              )}
              {currentStory.caption && currentStory.imageUrl && ( // Show caption below image if both exist
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-sm text-center whitespace-pre-wrap">{currentStory.caption}</p>
                </div>
              )}
            </>
          )}
          {!loadingStories && !currentStory && author && (
            <div className="text-white text-center p-4">
              No stories to display for {author.displayName}.
            </div>
          )}
        </div>

        {!loadingStories && stories.length > 1 && (
          <>
            {currentStoryIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white hover:text-white rounded-full h-10 w-10"
                onClick={goToPreviousStory}
                aria-label="Previous story"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {currentStoryIndex < stories.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white hover:text-white rounded-full h-10 w-10"
                onClick={goToNextStory}
                aria-label="Next story"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </>
        )}
         
        <DialogClose
          className="absolute top-3 right-3 z-20 p-1 rounded-full bg-black/30 hover:bg-black/60 text-white hover:text-white data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={handleDialogClose}
          aria-label="Close story viewer"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
