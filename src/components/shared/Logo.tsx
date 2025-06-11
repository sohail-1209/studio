// src/components/shared/Logo.tsx
import Link from 'next/link';
// Removed: import { MessageCircle } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const DeerIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
  >
    {/* Simple Deer/Stag head icon path */}
    <path d="M16.767 10.233A4.998 4.998 0 0 0 12 6a4.998 4.998 0 0 0-4.767 4.233C4.053 10.638 2 13.477 2 17c0 1.657 1.343 3 3 3h1c.553 0 1-.447 1-1s-.447-1-1-1H5c-.552 0-1-.448-1-1 0-2.714 1.452-5.077 3.589-6.309.315-.182.536-.508.573-.87C8.246 9.275 8.777 7.87 10.23 7.16c.759-.369 1.645-.56 2.537-.56.892 0 1.778.191 2.537.56 1.453.71 1.984 2.115 2.067 2.662.037.362.258.688.573.87C20.548 11.923 22 14.286 22 17c0 .552-.448 1-1 1h-1c-.553 0-1 .447-1 1s.447 1 1 1h1c1.657 0 3-1.343 3-3 0-3.523-2.053-6.362-5.233-6.767zM9 4c0-1.105.895-2 2-2s2 .895 2 2h-1c0-.552-.448-1-1-1s-1 .448-1 1H9zm1.5 11h3c.275 0 .5.225.5.5s-.225.5-.5.5h-3c-.275 0-.5-.225-.5-.5s.225-.5.5-.5z"/>
  </svg>
);

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-logoText ${className}`}>
      <DeerIcon size={iconSize} />
      <span className={`font-headline font-bold ${textSize}`}>NExCHAT</span>
    </Link>
  );
}
