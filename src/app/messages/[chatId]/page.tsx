// src/app/messages/[chatId]/page.tsx
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Paperclip, Send, Phone, Video, Smile } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState, use } from 'react';

// Placeholder messages
const sampleMessages = [
  { id: '1', sender: 'other', text: 'Hey there! How are you doing?', time: '10:00 AM', avatar: 'https://placehold.co/40x40.png?text=O' },
  { id: '2', sender: 'me', text: "I'm good, thanks! Just working on some stuff. You?", time: '10:01 AM' },
  { id: '3', sender: 'other', text: 'Same here. Busy day!', time: '10:02 AM', avatar: 'https://placehold.co/40x40.png?text=O' },
  { id: '4', sender: 'me', text: 'Tell me about it! 😅', time: '10:02 AM' },
  { id: '5', sender: 'other', text: 'Wanna grab coffee later?', time: '10:05 AM', avatar: 'https://placehold.co/40x40.png?text=O' },
  { id: '6', sender: 'me', text: 'Sure, sounds good! What time?', time: '10:06 AM' },
  { id: '7', sender: 'other', image: 'https://placehold.co/300x200.png', time: '10:10 AM', avatar: 'https://placehold.co/40x40.png?text=O', aiHint: "funny cat" },
];

export default function ChatPage({ params: paramsPromise }: { params: { chatId: string } }) {
  const params = use(paramsPromise);
  const { chatId } = params;
  const [chatPartner, setChatPartner] = useState({ name: "User " + chatId.substring(0,5), avatar: `https://placehold.co/40x40.png?text=${chatId.charAt(0).toUpperCase()}` });
  const [messages, setMessages] = useState(sampleMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false); // Placeholder for typing indicator

  // Simulate fetching chat partner details
  useEffect(() => {
    // In a real app, fetch chat details based on chatId
    // For now, derive from chatId or use a static example
    const partnerName = "Partner " + chatId.substring(0, 4);
    const partnerAvatar = `https://placehold.co/40x40.png?text=${partnerName.charAt(0).toUpperCase()}`;
    setChatPartner({ name: partnerName, avatar: partnerAvatar });
  }, [chatId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    const newMsg = {
      id: String(messages.length + 1),
      sender: 'me',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMsg]);
    setNewMessage('');
    // Simulate typing indicator off after sending
    setIsTyping(false); 
    // Simulate partner typing reply
    setTimeout(() => setIsTyping(true), 1000);
    setTimeout(() => {
      const replyMsg = {
        id: String(messages.length + 2),
        sender: 'other',
        text: 'Got it!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: chatPartner.avatar,
      };
      setMessages(prev => [...prev, replyMsg]);
      setIsTyping(false);
    }, 3000);
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col"> {/* Adjust height */}
        {/* Chat Header */}
        <header className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <Link href="/messages">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <Avatar>
              <AvatarImage src={chatPartner.avatar} alt={chatPartner.name} data-ai-hint="user avatar" />
              <AvatarFallback>{chatPartner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{chatPartner.name}</p>
              <p className="text-xs text-muted-foreground">Online</p> {/* Placeholder status */}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-end space-x-2",
                  msg.sender === 'me' ? "justify-end" : "justify-start"
                )}
              >
                {msg.sender === 'other' && (
                  <Avatar className="h-8 w-8 self-start">
                    <AvatarImage src={msg.avatar} alt="Sender" data-ai-hint="user avatar" />
                    <AvatarFallback>{msg.id}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xs rounded-lg p-3 lg:max-w-md",
                    msg.sender === 'me'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.text && <p className="text-sm">{msg.text}</p>}
                  {msg.image && <img src={msg.image} alt="Sent image" className="mt-2 rounded-md max-w-full h-auto" data-ai-hint={msg.aiHint} />}
                  <p className={cn(
                      "mt-1 text-xs",
                      msg.sender === 'me' ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-right"
                    )}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-end space-x-2 justify-start">
                 <Avatar className="h-8 w-8 self-start">
                    <AvatarImage src={chatPartner.avatar} alt="Sender" data-ai-hint="user avatar" />
                    <AvatarFallback>{chatPartner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                <div className="bg-muted text-foreground rounded-lg p-3">
                  <p className="text-sm italic">typing...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <footer className="border-t bg-card p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" type="button"><Smile className="h-5 w-5 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" type="button"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
            <Input
              type="text"
              placeholder="Type a message..."
              className="flex-1"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Simulate typing indicator on
                if(e.target.value.length > 0 && !isTyping) setIsTyping(true);
                if(e.target.value.length === 0 && isTyping) setIsTyping(false);
              }}
            />
            <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90">
              <Send className="h-5 w-5 text-primary-foreground" />
            </Button>
          </form>
        </footer>
      </div>
    </MainLayout>
  );
}
