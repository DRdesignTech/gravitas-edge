import Eyebrow from '@/components/marketing/Eyebrow';
import InfoCard from '@/components/marketing/InfoCard';
import HomeAnchor from '@/components/marketing/HomeAnchor';

const steps = [
  {
    index: '01',
    title: 'Explore Free Opportunities',
    description:
      'Browse current opportunities without subscribing. The full free preview is available right on this page.',
  },
  {
    index: '02',
    title: 'Find Relevant Roles',
    description:
      'See whether available opportunities match your experience, geography and career interests before taking any next step.',
  },
  {
    index: '03',
    title: 'Choose Your Access',
    description:
      'If you find relevant opportunities, choose the Opportunity Vault that matches your search.',
  },
  {
    index: '04',
    title: 'Unlock & Apply',
    description:
      'Subscribe to access the complete opportunity information and the available application or contact route, then pursue relevant roles.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white dark:bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
            How Gravitas Edge works.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            A simple four-step journey — from browsing real opportunities on this page to unlocking
            the access that fits your search.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <InfoCard key={step.index} {...step} />
          ))}
        </div>

        <div className="mt-10">
          <HomeAnchor
            href="#free-preview"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 sm:text-base"
          >
            Explore the Free Preview
            <span aria-hidden="true">↓</span>
          </HomeAnchor>
        </div>
      </div>
    </section>
  );
}