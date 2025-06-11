
// src/app/signup/page.tsx
import { SignupForm } from '@/components/auth/SignupForm';
import { AuthLayout } from '@/components/layout/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Synora',
  description: 'Create your Synora account.',
};

export default function SignupPage() {
  return (
    <AuthLayout title="Create your Account" subtitle="Join Synora today and connect with others.">
      <SignupForm />
    </AuthLayout>
  );
}

