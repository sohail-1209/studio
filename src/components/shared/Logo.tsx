// src/components/shared/Logo.tsx
import Link from 'next/link';
import Image from 'next/image'; 

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 36, textSize = "text-2xl" }: LogoProps) { // Increased default iconSize
  return (
    <Link href="/" className={`flex items-center gap-2 text-logoText ${className}`}>
      <Image
        src="https://toppng.com/uploads/preview/white-deer-silhouette-png-download-stag-logo-11563060029d1cigtaxq5.png"
        alt="NExCHAT Deer Logo"
        width={iconSize}
        height={iconSize}
        priority 
        className="rounded-full" // Added rounded-full for a circular appearance
      />
      <span className={`font-headline font-bold ${textSize}`}>NExCHAT</span>
    </Link>
  );
}
