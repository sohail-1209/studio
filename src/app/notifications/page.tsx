
// src/app/notifications/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Loader2 } from 'lucide-react'; // Added UserPlus, UserCheck, Loader2
import type { Metadata } from 'next';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  writeBatch,
  addDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import type { Notification, NotificationDocument } from '@/types/notification'; // Ensure this path is correct
import type { FollowRequestDocument } from '@/types/follow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';


export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);


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
          actionTaken: data.actionTaken || null,
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
      if (!notif.isRead && !notif.actionTaken) { 
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { isRead: true });
      }
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const updateLocalNotificationAction = (notificationId: string, action: 'accepted' | 'declined') => {
    setNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === notificationId ? { ...n, actionTaken: action, isRead: true } : n
      )
    );
  };

  const handleAcceptFollowRequest = async (notification: Notification) => {
    if (!user || !notification.followRequestId || notification.actionTaken) return;
    setProcessingRequestId(notification.id);
    updateLocalNotificationAction(notification.id, 'accepted'); 

    const batch = writeBatch(db);
    const followRequestRef = doc(db, 'followRequests', notification.followRequestId);
    const recipientProfileRef = doc(db, 'profiles', notification.recipientId); // Current user's profile (who is accepting)
    // const requesterProfileRef = doc(db, 'profiles', notification.actorId);    // Profile of the user who sent the request
    const originalNotificationRef = doc(db, 'notifications', notification.id);

    try {
      // 1. Update the follow request status
      batch.update(followRequestRef, { status: 'accepted', updatedAt: serverTimestamp() });
      
      // 2. Increment current user's (recipient's) followersCount
      batch.update(recipientProfileRef, { followersCount: increment(1) });
      
      // 3. Increment requester's followingCount - THIS WILL LIKELY FAIL with strict profile rules
      // For now, we remove this client-side attempt by the recipient.
      // This count should ideally be updated by a Cloud Function or by the requester's client.
      // batch.update(requesterProfileRef, { followingCount: increment(1) });

      // 4. Update the original 'follow_request' notification
      batch.update(originalNotificationRef, { isRead: true, actionTaken: 'accepted' });

      // 5. Create a new 'follow_accept' notification for the original requester
      const acceptNotificationData: Omit<NotificationDocument, 'createdAt'> = {
        recipientId: notification.actorId, // The one who sent the request
        actorId: user.uid, // The one who accepted the request             
        actorDisplayName: user.displayName,
        actorAvatarUrl: user.photoURL,
        type: 'follow_accept',
        originalFollowRequestId: notification.followRequestId, 
        isRead: false,
      };
      const newNotifRef = doc(collection(db, 'notifications'));
      batch.set(newNotifRef, {...acceptNotificationData, createdAt: serverTimestamp()});
      
      await batch.commit();
      toast({ title: "Follow Request Accepted", description: `You are now followed by ${notification.actorDisplayName || 'them'}.` });
    } catch (error: any) {
      console.error("Error accepting follow request:", error);
      toast({ title: "Error Accepting Request", description: error.message || "Could not accept follow request.", variant: "destructive" });
      // Revert optimistic update if batch commit fails
      setNotifications(prev => prev.map(n => n.id === notification.id ? {...n, actionTaken: null, isRead: notification.isRead } : n));
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeclineFollowRequest = async (notification: Notification) => {
    if (!user || !notification.followRequestId || notification.actionTaken) return;
    setProcessingRequestId(notification.id);
    updateLocalNotificationAction(notification.id, 'declined'); 

    const batch = writeBatch(db);
    const followRequestRef = doc(db, 'followRequests', notification.followRequestId);
    const originalNotificationRef = doc(db, 'notifications', notification.id);
    try {
      batch.update(followRequestRef, { status: 'declined', updatedAt: serverTimestamp() });
      batch.update(originalNotificationRef, { isRead: true, actionTaken: 'declined' });
      await batch.commit();
      toast({ title: "Follow Request Declined" });
    } catch (error: any) {
      console.error("Error declining follow request:", error);
      toast({ title: "Error Declining Request", description: error.message || "Could not decline follow request.", variant: "destructive" });
      setNotifications(prev => prev.map(n => n.id === notification.id ? {...n, actionTaken: null, isRead: notification.isRead } : n));
    } finally {
      setProcessingRequestId(null);
    }
  };


  const NotificationItemSkeleton = () => (
    <li className="flex items-center space-x-3 p-4 border-b">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </li>
  );


  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Notifications</CardTitle>
            </div>
            {notifications.some(n => !n.isRead && !n.actionTaken) && (
                 <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>Mark all as read</Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <ul className="divide-y divide-border">
                <NotificationItemSkeleton />
                <NotificationItemSkeleton />
                <NotificationItemSkeleton />
              </ul>
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
                  <li key={notif.id} className={`p-4 hover:bg-muted/50 transition-colors ${!notif.isRead && !notif.actionTaken ? 'bg-primary/5' : ''}`}>
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
                          {notif.type === 'like' && (
                            <>
                              <Link href={`/profile/${notif.actorId}`} className="font-semibold text-foreground hover:underline">{notif.actorDisplayName || 'Someone'}</Link>
                              {' liked '}
                              <Link href={`/post/${notif.postId}`} className="text-primary hover:underline cursor-pointer">
                                {notif.postContentPreview || 'your post'}
                              </Link>
                            </>
                          )}
                          {notif.type === 'comment' && (
                            <>
                              <Link href={`/profile/${notif.actorId}`} className="font-semibold text-foreground hover:underline">{notif.actorDisplayName || 'Someone'}</Link>
                              {' commented on '}
                              <Link href={`/post/${notif.postId}`} className="text-primary hover:underline cursor-pointer">
                                {notif.postContentPreview || 'your post'}
                              </Link>
                              {notif.commentText && (
                                <span className="text-muted-foreground block mt-1 italic">
                                  &ldquo;{notif.commentText}&rdquo;
                                </span>
                              )}
                            </>
                          )}
                          {notif.type === 'follow_request' && (
                            <>
                               <Link href={`/profile/${notif.actorId}`} className="font-semibold text-foreground hover:underline">{notif.actorDisplayName || 'Someone'}</Link>
                              {' wants to follow you.'}
                            </>
                          )}
                          {notif.type === 'follow_accept' && (
                             <>
                              <Link href={`/profile/${notif.actorId}`} className="font-semibold text-foreground hover:underline">{notif.actorDisplayName || 'Someone'}</Link>
                              {' accepted your follow request.'}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                        </p>

                        {notif.type === 'follow_request' && !notif.actionTaken && (
                          <div className="mt-2 flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptFollowRequest(notif)}
                              disabled={processingRequestId === notif.id}
                            >
                              {processingRequestId === notif.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <UserCheck className="mr-2 h-3 w-3"/>}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineFollowRequest(notif)}
                              disabled={processingRequestId === notif.id}
                            >
                              {processingRequestId === notif.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                              Decline
                            </Button>
                          </div>
                        )}
                        {notif.type === 'follow_request' && notif.actionTaken === 'accepted' && (
                          <p className="text-sm text-green-600 mt-1 italic">You accepted this request.</p>
                        )}
                        {notif.type === 'follow_request' && notif.actionTaken === 'declined' && (
                          <p className="text-sm text-red-600 mt-1 italic">You declined this request.</p>
                        )}
                      </div>
                      {!notif.isRead && !notif.actionTaken && (
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

