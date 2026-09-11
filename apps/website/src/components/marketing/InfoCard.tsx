interface InfoCardProps {
  index: string;
  title: string;
  description: string;
  className?: string;
}

export default function InfoCard({ index, title, description, className = '' }: InfoCardProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated sm:p-7 ${className}`}
    >
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-950 dark:text-brand-300"
        aria-hidden="true"
      >
        {index}
      </span>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-content">{title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-content-muted">{description}</p>
    </div>
  );
}
