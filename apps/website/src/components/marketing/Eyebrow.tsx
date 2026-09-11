interface EyebrowProps {
  children: React.ReactNode;
  invert?: boolean;
  className?: string;
}

export default function Eyebrow({ children, invert = false, className = '' }: EyebrowProps) {
  return (
    <span
      className={`text-xs font-semibold uppercase tracking-[0.22em] ${
        invert ? 'text-sky-300' : 'text-brand-600 dark:text-brand-300'
      } ${className}`}
    >
      {children}
    </span>
  );
}
