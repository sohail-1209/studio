
// src/app/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/layout/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Synora',
  description: 'Log in to your Synora account.',
};

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome Back!" subtitle="Log in to continue to Synora.">
      <LoginForm />
    </AuthLayout>
  );
}

