interface EyebrowProps {
  children: React.ReactNode;
  invert?: boolean;
  className?: string;
}

export default function Eyebrow({ children, invert = false, className = '' }: EyebrowProps) {
  return (
    <span
      className={`text-xs font-semibold uppercase tracking-[0.22em] ${
        invert ? 'text-[#E3B968]' : 'text-[#C8943E]'
      } ${className}`}
    >
      {children}
    </span>
  );
}
