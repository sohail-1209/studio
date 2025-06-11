// src/components/shared/Logo.tsx
import Link from 'next/link';
import Image from 'next/image'; 

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 32, textSize = "text-2xl" }: LogoProps) { 
  return (
    <Link href="/" className={`flex items-center gap-2 text-logoText ${className}`}>
      <Image
        src="https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png"
        alt="Synora Deer Logo"
        width={iconSize}
        height={iconSize}
        priority 
        className="rounded-full"
      />
      <span className={`font-logo font-bold ${textSize}`}>Synora</span>
    </Link>
  );
}
