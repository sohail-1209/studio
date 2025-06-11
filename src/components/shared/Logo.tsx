// src/components/shared/Logo.tsx
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <MessageCircle className="text-logoText" size={iconSize} />
      <span className={`font-headline font-bold text-logoText ${textSize}`}>NExCHAT</span>
    </Link>
  );
}
