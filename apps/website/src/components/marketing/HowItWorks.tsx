import Eyebrow from "./Eyebrow";

const steps = [
  {
    num: '01',
    title: 'Explore the Free Preview',
    description: 'See live roles by country and experience before you pay anything.',
  },
  {
    num: '02',
    title: 'Find relevant countries',
    description: 'Browse the country directory and filter by city, industry and experience.',
  },
  {
    num: '03',
    title: 'Choose your vault',
    description: 'Pick India, Global, or combined access that matches your experience.',
  },
  {
    num: '04',
    title: 'Reach out directly',
    description: 'Use the contact or application pathway and send your resume.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative bg-white dark:bg-[#0C1E38] py-[72px] scroll-mt-20">
      {/* Anchor for backwards compatibility & header scroll spy */}
      <div id="how-it-works" className="absolute -top-20" aria-hidden="true" />

      <div className="mx-auto max-w-[1180px] px-5">
        <div className="text-center">
          <Eyebrow>
            How it works
          </Eyebrow>
          <h2 className="font-bold tracking-[-0.02em] text-[#061B36] dark:text-[#F2F5FA] text-[clamp(1.7rem,3.4vw,2.5rem)] leading-[1.15] mb-2 font-sans">
            From discovery to direct outreach
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px] mt-[34px]">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-white dark:bg-[#0C1E38] border border-[#E9E5DC] dark:border-[#1E3557] rounded-[16px] p-[22px] shadow-[0_10px_30px_-12px_rgba(6,27,54,0.18)] dark:shadow-none"
            >
              <div className="font-sans font-bold text-[2rem] text-[#D6952F] leading-none mb-2">
                {step.num}
              </div>
              <h3 className="font-sans font-bold text-[1.05rem] text-[#061B36] dark:text-[#F2F5FA] leading-[1.2] mb-1.5">
                {step.title}
              </h3>
              <p className="text-[#5B6479] dark:text-[#93A3BE] text-[0.9rem] leading-[1.55]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
