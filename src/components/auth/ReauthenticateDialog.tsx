
// src/components/auth/ReauthenticateDialog.tsx
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Spinner } from '@/components/shared/Spinner';
import { Eye, EyeOff } from 'lucide-react';

const reauthSchema = z.object({
  password: z.string().min(1, { message: 'Password is required' }),
});

type ReauthFormInputs = z.infer<typeof reauthSchema>;

interface ReauthenticateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReauthenticateDialog({ open, onOpenChange, onSuccess }: ReauthenticateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReauthFormInputs>({
    resolver: zodResolver(reauthSchema),
  });

  const onSubmit: SubmitHandler<ReauthFormInputs> = async (data) => {
    if (!firebaseUser || !firebaseUser.email) {
      toast({ title: 'Error', description: 'User session not found or email is missing.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, data.password);
      await reauthenticateWithCredential(firebaseUser, credential);
      toast({ title: 'Re-authentication Successful', description: 'You can now proceed with the sensitive action.' });
      reset();
      onSuccess(); // Call the success callback to proceed (e.g., open final delete confirmation)
      onOpenChange(false); // Close this dialog
    } catch (error: any) {
      console.error("Re-authentication error:", error);
      toast({
        title: 'Re-authentication Failed',
        description: error.code === 'auth/wrong-password' ? 'Incorrect password. Please try again.' : error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Re-authenticate</DialogTitle>
          <DialogDescription>
            For your security, please enter your password to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="reauth-password">Password</Label>
            <div className="relative">
              <Input
                id="reauth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                autoComplete="current-password"
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
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
