// src/app/notifications/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/types/notification'; // Ensure this path is correct
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// export const metadata: Metadata = { // Metadata should be defined at the top level or in a separate metadata export
//   title: 'Notifications - NExCHAT',
//   description: 'View your notifications.',
// };
// This page uses client-side rendering for dynamic content, so metadata might be better handled in a layout or globally if static.

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const notificationsColRef = collection(db, 'notifications');
    const q = query(
      notificationsColRef,
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as Notification;
      });
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    const batch = writeBatch(db);
    notifications.forEach(notif => {
      if (!notif.isRead) {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { isRead: true });
      }
    });
    try {
      await batch.commit();
      // Optionally, update local state immediately or rely on onSnapshot
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  
  const NotificationItemSkeleton = () => (
    <div className="flex items-center space-x-3 p-4 border-b">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );


  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Notifications</CardTitle>
            </div>
            {notifications.some(n => !n.isRead) && (
                 <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>Mark all as read</Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div>
                <NotificationItemSkeleton />
                <NotificationItemSkeleton />
                <NotificationItemSkeleton />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold text-foreground">No new notifications</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;re all caught up! We&apos;ll let you know when there&apos;s something new.
                </p>
              </div>
            )}
            {!loading && notifications.length > 0 && (
              <ul className="divide-y divide-border">
                {notifications.map((notif) => (
                  <li key={notif.id} className={`p-4 hover:bg-muted/50 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}>
                    {/* TODO: Link to post when post detail page exists: Link href={`/post/${notif.postId}`} */}
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        {notif.actorAvatarUrl ? (
                           <Image src={notif.actorAvatarUrl} alt={notif.actorDisplayName || 'User'} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                        ) : (
                          <AvatarFallback>{(notif.actorDisplayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">{notif.actorDisplayName || 'Someone'}</span>
                          {notif.type === 'like' && ' liked '}
                          {notif.type === 'comment' && ' commented on '}
                          <span className="text-primary hover:underline cursor-pointer">
                            {notif.postContentPreview || 'your post'}
                          </span>
                          {notif.type === 'comment' && notif.commentText && (
                            <span className="text-muted-foreground block mt-1 italic">
                              &ldquo;{notif.commentText}&rdquo;
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="h-2.5 w-2.5 rounded-full bg-accent self-center"></div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
