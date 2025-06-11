// src/app/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/layout/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - NExCHAT',
  description: 'Log in to your NExCHAT account.',
};

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome Back!" subtitle="Log in to continue to NExCHAT.">
      <LoginForm />
    </AuthLayout>
  );
}
