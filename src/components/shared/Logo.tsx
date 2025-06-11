// src/components/shared/Logo.tsx
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const DeerIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" // Standard viewBox
    fill="currentColor"
    width={size}
    height={size}
    className={className}
  >
    {/* New deer (stag head) SVG path */}
    <path d="M12 2C9.29 2 7.01 3.36 5.93 5.41L8 8.34V12h3V9.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V12h3V8.34l2.07-2.93C16.99 3.36 14.71 2 12 2zm2.5 9c-.83 0-1.5-.67-1.5-1.5S13.67 8 14.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5S8.67 8 9.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-.5 2H7v3.05C5.28 16.53 4 18.6 4 21c0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-2.4-1.28-4.47-3.05-4.95V13h-2.95c-.77 1.25-2.06 2.14-3.55 2.37V13z"/>
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
