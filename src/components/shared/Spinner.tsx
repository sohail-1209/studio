// src/components/shared/Spinner.tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 24, className }: SpinnerProps) {
  return (
    <Loader2
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn('animate-spin text-primary', className)}
    />
  );
}
