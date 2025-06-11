
// src/components/stories/StoryViewerDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Post } from '@/types/post';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@/components/shared/Spinner';

interface StoryViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stories: Post[];
  author: {
    displayName: string | null;
    photoURL: string | null;
    userId: string;
  } | null;
  loadingStories: boolean;
}

export function StoryViewerDialog({ open, onOpenChange, stories, author, loadingStories }: StoryViewerDialogProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  useEffect(() => {
    // Reset to first story when dialog opens or stories/author changes
    setCurrentStoryIndex(0);
  }, [open, stories, author]);

  if (!author) {
    return null; // Or a loading state if author is fetched separately
  }

  const currentStory = stories[currentStoryIndex];

  const goToNextStory = () => {
    setCurrentStoryIndex((prevIndex) => Math.min(prevIndex + 1, stories.length - 1));
  };

  const goToPreviousStory = () => {
    setCurrentStoryIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleDialogClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 gap-0 !rounded-lg overflow-hidden aspect-[9/16] max-h-[90vh] flex flex-col">
        {loadingStories && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
            <Spinner size={48} />
          </div>
        )}
        {!loadingStories && currentStory && (
          <>
            <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={author.photoURL || undefined} alt={author.displayName || 'User'} data-ai-hint="user avatar" />
                  <AvatarFallback>{(author.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-sm font-semibold text-white">{author.displayName}</DialogTitle>
                  <p className="text-xs text-gray-300">
                    {formatDistanceToNow(currentStory.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden">
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
              {/* Rudimentary video display - ideally use a video player */}
              {currentStory.videoUrl && (
                 <Image 
                    src={currentStory.videoUrl} // Assuming videoUrl is a placeholder image for the video
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
            </div>

            {/* Navigation Buttons */}
            {stories.length > 1 && (
              <>
                {currentStoryIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white hover:text-white rounded-full h-10 w-10"
                    onClick={goToPreviousStory}
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
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
              </>
            )}
             {/* Progress dots/bars could go here */}
            <DialogClose
              className="absolute top-3 right-3 z-20 p-1 rounded-full bg-black/30 hover:bg-black/60 text-white hover:text-white data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              onClick={handleDialogClose}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </>
        )}
        {!loadingStories && !currentStory && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
                No story to display.
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
