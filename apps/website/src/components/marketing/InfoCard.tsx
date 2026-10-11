interface InfoCardProps {
  index: string;
  title: string;
  description: string;
  className?: string;
}

export default function InfoCard({ index, title, description, className = '' }: InfoCardProps) {
  return (
    <div
      className={`card-static flex h-full flex-col rounded-2xl p-6 sm:p-7 ${className}`}
    >
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-sm font-bold text-brand-600 ring-1 ring-inset ring-brand-500/15 dark:from-brand-950 dark:to-brand-900 dark:text-brand-300 dark:ring-brand-400/20"
        aria-hidden="true"
      >
        {index}
      </span>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-content">{title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-content-muted">{description}</p>
    </div>
  );
}
