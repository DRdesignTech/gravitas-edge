import Image from 'next/image';

export const BRAND_NAME = 'GRAVITS EDGE CONSULTANT';

interface BrandLogoProps {
  className?: string;
  showName?: boolean;
  nameClassName?: string;
}

export default function BrandLogo({
  className = 'h-9 w-auto',
  showName = true,
  nameClassName = 'text-sm font-bold tracking-tight text-content',
}: BrandLogoProps) {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/brand/logo.png"
        alt="Gravits Edge Consultant logo"
        width={1459}
        height={1078}
        priority
        className={className}
        style={{ objectFit: 'contain' }}
      />
      {showName && <span className={nameClassName}>{BRAND_NAME}</span>}
    </span>
  );
}
