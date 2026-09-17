import { BRAND_LOGO_SRC } from '@/lib/brand';

export const BRAND_NAME = 'Gravitas Edge Consulting';

interface BrandLogoProps {
  className?: string;
  showName?: boolean;
  nameClassName?: string;
}

export default function BrandLogo({
  className = 'h-10 w-auto',
  showName = true,
  nameClassName = 'text-lg font-bold tracking-tight text-content',
}: BrandLogoProps) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex shrink-0 items-center justify-center rounded-full bg-white p-2 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_LOGO_SRC}
          alt="Gravitas Edge Consulting logo"
          width={1254}
          height={1254}
          className={className}
          style={{ objectFit: 'contain' }}
        />
      </span>
      {showName && <span className={nameClassName}>{BRAND_NAME}</span>}
    </span>
  );
}
