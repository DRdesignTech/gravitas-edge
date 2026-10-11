import type { ReactNode } from 'react';

function StepIcon({
  children,
  className = 'h-4 w-4 sm:h-5 sm:w-5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const steps: { title: string; description: string; icon: ReactNode }[] = [
  {
    title: 'Explore Free Preview',
    description: 'Check the latest available opportunities.',
    icon: (
      <>
        <path d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.75" />
      </>
    ),
  },
  {
    title: 'Find Relevant Opportunities',
    description: 'Choose opportunities that match your experience and goals.',
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.4-3.4" />
      </>
    ),
  },
  {
    title: 'Choose Access',
    description: 'Pick the right Opportunity Vault for full details.',
    icon: (
      <>
        <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
        <path d="M8.5 10V7.75a3.5 3.5 0 0 1 7 0V10" />
      </>
    ),
  },
  {
    title: 'Reach Out Directly',
    description: 'Use the available contact details and apply directly.',
    icon: (
      <>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
      </>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-glow-navy relative scroll-mt-20 bg-surface">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8943E]">
            How It Works
          </p>
          <h2 className="mt-4 font-serif-heading text-3xl font-bold text-content sm:text-4xl lg:text-5xl">
            How It Works
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted sm:text-lg">
            From discovery to application in a few simple steps.
          </p>
        </div>

        <ol className="mt-12 max-w-3xl space-y-8 sm:mt-16 sm:space-y-10">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex items-start gap-3 sm:gap-6">
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[23px] top-[54px] bottom-[-2rem] w-[2px] rounded-full bg-[#C8943E]/40 sm:left-[27px] sm:top-[62px] sm:bottom-[-2.5rem]"
                />
              )}
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-[#C8943E] bg-[#061B36] font-serif-heading text-lg font-bold leading-none text-white lining-nums tabular-nums shadow-[0_12px_28px_-12px_rgba(6,27,54,0.65)] sm:h-14 sm:w-14 sm:text-xl">
                <span className="block translate-y-[0.075em] leading-none">{i + 1}</span>
              </span>
              <div className="flex min-w-0 items-start gap-2.5 pt-1.5 sm:gap-3 sm:pt-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-[#C8943E] ring-1 ring-inset ring-[#C8943E]/15 sm:h-10 sm:w-10">
                  <StepIcon>{step.icon}</StepIcon>
                </span>
                <div className="min-w-0">
                  <h3 className="font-serif-heading text-xl font-bold leading-snug text-content sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-content-muted sm:text-base">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
