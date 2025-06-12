
// src/components/auth/SignupForm.tsx
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/contexts/AuthContext';
import { Spinner } from '@/components/shared/Spinner';
import { Eye, EyeOff } from 'lucide-react';

const signupSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).max(20, { message: 'Username must be at most 20 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: data.username,
        photoURL: `https://placehold.co/100x100.png?text=${data.username.charAt(0).toUpperCase()}`,
      });
      
      // Create user document in Firestore
      const newUserProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: data.username,
        photoURL: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${data.username.charAt(0).toUpperCase()}`,
        username: data.username,
        bio: '',
        followersCount: 0,
        followingCount: 0,
      };
      await setDoc(doc(db, 'profiles', firebaseUser.uid), newUserProfile);

      // Send email verification
      await sendEmailVerification(firebaseUser);

      // Sign the user out
      await signOut(auth);

      toast({ 
        title: 'Account Created! Please Verify Your Email.', 
        description: 'A verification link has been sent to your email address. Please verify your email before logging in.',
        duration: 10000, // Longer duration for this important message
      });
      router.push('/login'); // Redirect to login page
    } catch (error: any) {
      console.error("Signup Form Error Details:", error);
      let description = error.message || 'An unexpected error occurred.';
      if (error.code === 'auth/network-request-failed') {
        description = 'A network error occurred. Please check your internet connection, firewall settings, and ensure no browser extensions are interfering. Then try again.';
      }
      toast({
        title: 'Signup Failed',
        description: description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="yourusername"
          {...register('username')}
          className={errors.username ? 'border-destructive' : ''}
        />
        {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            {...register('password')}
            className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
        {loading ? <Spinner size={20} className="mr-2" /> : null}
        Sign Up
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

