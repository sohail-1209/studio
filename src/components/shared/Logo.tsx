// src/components/shared/Logo.tsx
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

// New SVG path for a full-body standing deer
const DeerIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" // Standard viewBox, path is designed for this
    fill="currentColor"
    width={size}
    height={size}
    className={className}
  >
    <path d="M20.82,8.06A1,1,0,0,0,20,7.27V6a1,1,0,0,0-2,0V7.18A6,6,0,0,0,12.2,2.06,1,1,0,0,0,12,2a1,1,0,0,0-.2.06A6,6,0,0,0,6,7.18V6A1,1,0,0,0,4,6V7.27a1,1,0,0,0-.82.79,1,1,0,0,0,.21,1l3.21,4.93V18H5a1,1,0,0,0,0,2H8.42l.31,1.26A1,1,0,0,0,9.69,22h4.62a1,1,0,0,0,.95-.74L15.58,20H19a1,1,0,0,0,0-2H17.38V14L20.61,9A1,1,0,0,0,20.82,8.06ZM12,4.08A3.91,3.91,0,0,1,15.42,7H8.58A3.91,3.91,0,0,1,12,4.08ZM10,18v-.19l-.42-1.68a1,1,0,0,0-1-.83H7.82L10,18Zm6.18-2.7a1,1,0,0,0-1-.83H14.42L14,17.81V18h2.18ZM15,13.2V16H9V13.2L6.35,9H17.65Z" />
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
