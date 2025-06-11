// src/components/shared/Logo.tsx
import Link from 'next/link';
import Image from 'next/image'; // Import next/image

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

// The DeerIcon component is no longer an SVG, it will be an Image.
// We'll use next/image directly in the Logo component.

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-logoText ${className}`}>
      <Image
        src="/deer-logo.png" // Assumes deer-logo.png is in the /public folder
        alt="NExCHAT Deer Logo"
        width={iconSize}
        height={iconSize}
        priority // Good for LCP elements like logos
      />
      <span className={`font-headline font-bold ${textSize}`}>NExCHAT</span>
    </Link>
  );
}
