// src/app/signup/page.tsx
import { SignupForm } from '@/components/auth/SignupForm';
import { AuthLayout } from '@/components/layout/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - NExCHAT',
  description: 'Create your NExCHAT account.',
};

export default function SignupPage() {
  return (
    <AuthLayout title="Create your Account" subtitle="Join NExCHAT today and connect with others.">
      <SignupForm />
    </AuthLayout>
  );
}
