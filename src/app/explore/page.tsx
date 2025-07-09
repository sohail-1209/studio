
// src/app/explore/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, Image as ImageIcon, Search as SearchIcon, User as UserIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, FormEvent, useCallback, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, Timestamp, getDocs, QuerySnapshot } from 'firebase/firestore';
import type { Post } from '@/types/post';
import type { UserProfile } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// Standard debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
}

const capitalize = (s: string): string => {
  if (typeof s !== 'string' || s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};


export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingRecentPosts, setLoadingRecentPosts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingUserExact, setIsSearchingUserExact] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputFocusedRef = useRef(false);


  useEffect(() => {
    const fetchExplorePosts = async () => {
      setLoadingRecentPosts(true);
      try {
        const postsColRef = collection(db, 'posts');
        const q = query(
          postsColRef,
          where('isStory', '!=', true),
          where('authorIsPrivate', '==', false),
          orderBy('createdAt', 'desc'),
          limit(24)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedPosts = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as Post;
          })
          .filter(post => post.imageUrl); 

        setPosts(fetchedPosts);
      } catch (error: any) {
        console.error("Error fetching explore posts:", error);
        if (error.code === 'failed-precondition') {
          toast({
            title: "Error Fetching Explore Content",
            description: "A database index might be required for explore posts. Please check the Firebase console for a link to create it.",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "Error Fetching Content",
            description: "Could not load explore content. Please try again later.",
            variant: "destructive",
          });
        }
      } finally {
        setLoadingRecentPosts(false);
      }
    };

    fetchExplorePosts();
  }, [toast, currentUser]);

  const handleExactUsernameSearch = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const trimmedUsername = searchTerm.trim();
    
    if (!trimmedUsername) {
      toast({
        title: "Empty Username",
        description: "Please enter a username to search.",
        variant: "default",
      });
      return;
    }

    setIsSearchingUserExact(true);
    setShowSuggestions(false);
    
    let userDocSnapshot: QuerySnapshot | null = null;
    let foundUserId: string | null = null;
    const profilesRef = collection(db, 'profiles');

    try {
      const qExact = query(profilesRef, where('username', '==', trimmedUsername), limit(1));
      userDocSnapshot = await getDocs(qExact);

      if (!userDocSnapshot.empty) {
        foundUserId = userDocSnapshot.docs[0].id;
      } else {
        const lowerCaseTerm = trimmedUsername.toLowerCase();
        if (lowerCaseTerm !== trimmedUsername) {
          const qLower = query(profilesRef, where('username', '==', lowerCaseTerm), limit(1));
          userDocSnapshot = await getDocs(qLower);
          if (!userDocSnapshot.empty) {
            foundUserId = userDocSnapshot.docs[0].id;
          }
        }
      }

      if (!foundUserId) {
        const capitalizedTerm = capitalize(trimmedUsername);
        if (capitalizedTerm !== trimmedUsername && capitalizedTerm !== trimmedUsername.toLowerCase()) {
            const qCapitalized = query(profilesRef, where('username', '==', capitalizedTerm), limit(1));
            userDocSnapshot = await getDocs(qCapitalized);
            if (!userDocSnapshot.empty) {
                foundUserId = userDocSnapshot.docs[0].id;
            }
        }
      }

      if (foundUserId) {
        router.push(`/profile/${foundUserId}`);
        setSearchTerm('');
        setSuggestedUsers([]);
      } else {
        toast({
          title: "User Not Found",
          description: `No user found with the username "${trimmedUsername}" (tried common casings).`,
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error searching for user by username:", error);
      if (error.code === 'failed-precondition') {
        toast({
          title: "Search Error",
          description: "Could not perform search. A database index might be missing for usernames. Please contact support or check Firebase console.",
          variant: "destructive",
          duration: 7000,
        });
      } else {
        toast({
          title: "Search Error",
          description: "An error occurred while searching for the user.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearchingUserExact(false);
    }
  };

  const fetchUserSuggestions = useCallback(async (currentSearchTerm: string) => {
    const term = currentSearchTerm.trim();
    if (term.length < 2) {
      setSuggestedUsers([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const profilesRef = collection(db, 'profiles');
    const uniqueUserProfiles = new Map<string, UserProfile>();

    const prefixesSet = new Set<string>();
    prefixesSet.add(term.toLowerCase());
    prefixesSet.add(term);
    prefixesSet.add(term.charAt(0).toUpperCase() + term.slice(1));
    prefixesSet.add(term.charAt(0).toUpperCase() + term.slice(1).toLowerCase());

    const distinctPrefixes = Array.from(prefixesSet).filter(p => p.length >= 1);

    try {
      for (const p of distinctPrefixes) {
        const q = query(
          profilesRef,
          where('username', '>=', p),
          where('username', '<=', p + '\uf8ff'),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.docs.forEach(doc => {
          if (!uniqueUserProfiles.has(doc.id)) {
            uniqueUserProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
          }
        });
      }

      const fetchedUsers = Array.from(uniqueUserProfiles.values());
      const sortedUsers = fetchedUsers.sort((a, b) =>
        (a.username || '').toLowerCase().localeCompare((b.username || '').toLowerCase())
      );
      const finalSuggestions = sortedUsers.slice(0, 10);

      setSuggestedUsers(finalSuggestions);

      if (finalSuggestions.length > 0 && inputFocusedRef.current) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } catch (error: any) {
      console.error("Error fetching user suggestions (multi-query):", error);
      if (error.code === 'failed-precondition') {
          toast({
            title: "Search Suggestion Error",
            description: "A database index might be required for username prefix suggestions. Please check Firebase console.",
            variant: "destructive",
            duration: 7000,
          });
        } else {
            console.error("Generic error fetching suggestions:", error.message);
        }
      setSuggestedUsers([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [toast]);

  const debouncedFetchUserSuggestions = useMemo(() => {
    return debounce(fetchUserSuggestions, 300);
  }, [fetchUserSuggestions]);

  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm.length >= 1) {
      debouncedFetchUserSuggestions(trimmedSearchTerm);
    } else {
      setSuggestedUsers([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
    }
  }, [searchTerm, debouncedFetchUserSuggestions]);

  const handleSuggestionClick = (userId: string) => {
    router.push(`/profile/${userId}`);
    setSearchTerm('');
    setSuggestedUsers([]);
    setShowSuggestions(false);
  };

  const PostGridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
      {[...Array(12)].map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-md" />
      ))}
    </div>
  );

  return (
    <MainLayout>
      <div className="w-full">
          <Card className="shadow-lg w-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Compass className="h-6 w-6 text-primary" />
                <CardTitle>Explore</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 relative">
                <h3 className="text-lg font-semibold text-foreground mb-2">Find a User by Username</h3>
                <form onSubmit={handleExactUsernameSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <Input
                    type="text"
                    placeholder="Enter Username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => {
                      inputFocusedRef.current = true;
                      if (suggestedUsers.length > 0 && searchTerm.length >= 1) {
                         setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                          inputFocusedRef.current = false;
                          setShowSuggestions(false);
                      }, 200);
                    }}
                    className="flex-grow"
                    disabled={isSearchingUserExact}
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={isSearchingUserExact || loadingSuggestions} className="w-full sm:w-auto">
                    {isSearchingUserExact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                     Search
                  </Button>
                </form>
                {showSuggestions && searchTerm.trim().length >= 1 && (
                   <div className="absolute z-10 w-full sm:w-[calc(100%-5rem)] mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg">
                    {loadingSuggestions && (
                      <div className="p-3 text-sm text-muted-foreground text-center">Loading suggestions...</div>
                    )}
                    {!loadingSuggestions && suggestedUsers.length === 0 && searchTerm.trim().length >= 1 && (
                      <div className="p-3 text-sm text-muted-foreground">No users found matching &quot;{searchTerm}&quot;. Try an exact match or different casing.</div>
                    )}
                    {!loadingSuggestions && suggestedUsers.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center space-x-2 p-3 hover:bg-muted cursor-pointer"
                        onMouseDown={() => handleSuggestionClick(user.uid)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                          <AvatarFallback>{(user.displayName || user.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.displayName || 'Unnamed User'}</p>
                          <p className="text-xs text-muted-foreground">@{user.username || 'username_missing'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Type for username suggestions (case-insensitive prefix matching). Press Enter or Search for a more forgiving exact match.
                </p>
              </div>
              <Separator className="my-6" />

              <h3 className="text-lg font-semibold text-foreground mb-4">Discover Posts</h3>
              {loadingRecentPosts && <PostGridSkeleton />}
              {!loadingRecentPosts && posts.length === 0 && (
                <div className="py-12 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-semibold text-foreground">Nothing to explore yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check back later for new and exciting content from other users!
                  </p>
                </div>
              )}
              {!loadingRecentPosts && posts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2">
                  {posts.map((post) => (
                    <Link href={`/profile/${post.userId}`} key={post.id} className="group relative aspect-square block w-full overflow-hidden rounded-md">
                      {post.imageUrl ? (
                        <Image
                          src={post.imageUrl}
                          alt={post.caption || 'Explore post'}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          style={{objectFit: 'cover'}}
                          className="transition-transform duration-300 group-hover:scale-105"
                          data-ai-hint={post.dataAiHint || "photo landscape"}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 flex flex-col justify-end">
                          <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6 border-2 border-background">
                                  <AvatarImage src={post.userAvatarUrl || undefined} alt={post.userDisplayName || 'User'} />
                                  <AvatarFallback>{(post.userDisplayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <p className="text-xs font-medium text-white truncate">
                                  {post.userDisplayName || 'Anonymous'}
                              </p>
                          </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </MainLayout>
  );
}
