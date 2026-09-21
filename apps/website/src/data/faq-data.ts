export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  order: number;
}

export const faqCategories: FaqCategory[] = [
  { id: 'about-gravitas-edge', label: 'About Gravitas Edge', order: 1 },
  { id: 'opportunity-vaults', label: 'Opportunity Vaults', order: 2 },
  { id: 'jobs-and-opportunities', label: 'Jobs and Opportunities', order: 3 },
  { id: 'subscription-and-payment', label: 'Subscription and Payment', order: 4 },
  { id: 'payments', label: 'Payments', order: 5 },
  { id: 'access-and-delivery', label: 'Access and Delivery', order: 6 },
  { id: 'account-and-website-access', label: 'Account and Website Access', order: 7 },
  { id: 'international-opportunities', label: 'International Opportunities', order: 8 },
  { id: 'applications-and-employers', label: 'Applications and Employers', order: 9 },
  { id: 'services-not-currently-included', label: 'Services Not Currently Included', order: 10 },
  { id: 'transparency', label: 'Transparency', order: 11 },
  { id: 'getting-the-most-value', label: 'Getting the Most Value from the Vault', order: 12 },
  { id: 'previous-subscribers', label: 'Previous Subscribers and Website Transition', order: 13 },
  { id: 'legal-and-policies', label: 'Legal and Policies', order: 14 },
];

export const faqData: FaqItem[] = [
  // ── About Gravitas Edge ──────────────────────────────────────────────
  {
    id: 1,
    question: 'What is Gravitas Edge Consulting?',
    answer:
      'Gravitas Edge Consulting shares job opportunities and what employers are looking for with professionals in India and other countries. We find relevant jobs, check the information we share, and give subscribers the job details plus the recruiter or hiring manager\u2019s contact details. This is an information service, not a recruitment agency or placement service.',
    category: 'about-gravitas-edge',
  },
  {
    id: 2,
    question: 'What exactly do I get with a Gravitas Edge subscription?',
    answer:
      'Depending on the plan you choose, you receive: jobs that match your experience level or target location, complete job details, the recruiter or hiring manager\u2019s contact details, the application instructions and contact details where available, access to the right Opportunity Vault, and helpful job-market updates. We only publish a job when we have a relevant direct hiring contact for it.',
    category: 'about-gravitas-edge',
  },
  {
    id: 3,
    question: 'Is Gravitas Edge a recruitment agency?',
    answer:
      'No. Gravitas Edge is a job-information platform. We do not represent candidates to employers, guarantee interviews, or place people in jobs. You apply directly to the employer, recruiter or hiring contact shown in the job.',
    category: 'about-gravitas-edge',
  },
  {
    id: 4,
    question: 'Do you provide direct placement or job guarantees?',
    answer:
      'No. We do not guarantee a job, interview, shortlist, offer or placement. We give you access to selected jobs and direct hiring contacts so you can approach relevant opportunities more effectively.',
    category: 'about-gravitas-edge',
  },
  {
    id: 5,
    question: 'Do you provide resume/CV assistance?',
    answer:
      'Not at present. Resume writing, CV preparation and similar career-support services are not part of the subscription right now. These services may be added in the future.',
    category: 'about-gravitas-edge',
  },

  // ── Opportunity Vaults ───────────────────────────────────────────────
  {
    id: 6,
    question: 'What opportunity vaults are available?',
    answer:
      'India vaults: Career Access (0\u20135 years), Professional Access (5\u201310 years), Leadership Access (10\u201315 years), and Executive Access (15+ years). For jobs outside India there is Global Access (all experience levels), with a main focus on the Middle East and other international markets.',
    category: 'opportunity-vaults',
  },
  {
    id: 7,
    question: 'How do I know which India vault is right for me?',
    answer:
      'Pick based on your total work experience: 0\u20135 years for Career Access, 5\u201310 years for Professional Access, 10\u201315 years for Leadership Access, and 15+ years for Executive Access. These bands keep the jobs broadly in line with your career stage, but each role has its own requirements.',
    category: 'opportunity-vaults',
  },
  {
    id: 8,
    question: 'Does Global Access have an experience limit?',
    answer:
      'No. Global Access is open to professionals at all experience levels. It is for candidates looking for jobs outside India, with a main focus on the Middle East and other international markets.',
    category: 'opportunity-vaults',
  },
  {
    id: 9,
    question: 'Does Global Access only contain Middle East jobs?',
    answer:
      'No. The Middle East is the main focus, but Global Access can also include relevant jobs in other international markets.',
    category: 'opportunity-vaults',
  },

  // ── Jobs and Opportunities ───────────────────────────────────────────
  {
    id: 10,
    question: 'Where do the opportunities come from?',
    answer:
      'Jobs are collected from several channels and checked before being added to a vault. The information may come from employers, recruiters, professional networks, hiring channels and other reliable sources, depending on the job.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 11,
    question: 'Are the jobs verified?',
    answer:
      'We select and check jobs before publishing them, based on the information available to us. A key part of this is having a direct hiring contact. We only publish a job when we have a relevant recruiter, hiring manager or other direct hiring contact for it. Hiring situations can still change quickly \u2014 a company may close a role, pause hiring, change requirements or stop accepting applications after a job is published.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 12,
    question: 'Are these real jobs or just job links collected from job portals?',
    answer:
      'Gravitas Edge is not a simple list of job-board links. We focus on jobs where we have a relevant direct hiring contact, so you can approach the opportunity through a more direct route. The value is the selection, the relevance and the direct hiring access \u2014 not just a list of links.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 13,
    question: 'Will every job have a recruiter or hiring-manager contact?',
    answer:
      'Yes. We only publish jobs where direct contact information is available. The contact may be a recruiter, hiring manager or another person involved in hiring. If we do not have an appropriate direct hiring contact for a job, we do not add it to the vault.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 14,
    question: 'Can I apply directly to the hiring manager or recruiter?',
    answer:
      'Yes. Where a direct hiring contact is provided, you can use it to approach the right person directly. The job also shows the available application instructions where applicable.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 15,
    question: 'Do you contact recruiters on my behalf?',
    answer:
      'No. Gravitas Edge provides the job and the direct hiring contact details. You are responsible for contacting recruiters, hiring managers or employers and sending your application.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 16,
    question: 'Can you promote my profile to recruiters?',
    answer:
      'No. The subscription does not currently include profile promotion, candidate marketing or placement services.',
    category: 'jobs-and-opportunities',
  },

  // ── Subscription and Payment ─────────────────────────────────────────
  {
    id: 17,
    question: 'Do I have to pay to apply for a job?',
    answer:
      'No. You never pay an employer or recruiter to apply for a job. Gravitas Edge is a paid subscription that gives you access to selected jobs and direct hiring information. The payment is for access to the service, not for applying to any individual job.',
    category: 'subscription-and-payment',
  },
  {
    id: 18,
    question: 'Why should I pay for access when jobs are available online for free?',
    answer:
      'Many jobs are public. The difference is that Gravitas Edge focuses on selection, relevance and direct hiring access. We focus on jobs where the recruiter or hiring contact details are available, which can save you the time of searching for both the job and the right person to contact. If you are comfortable finding job boards and hiring contacts yourself, you may not need a paid service.',
    category: 'subscription-and-payment',
  },
  {
    id: 19,
    question: 'Is the subscription a payment for a guaranteed job?',
    answer:
      'No. You are paying for access to the Gravitas Edge vault and its selected information. There is no payment for a guaranteed interview, shortlist, job offer or placement.',
    category: 'subscription-and-payment',
  },
  {
    id: 20,
    question: 'Can I see what kind of opportunities are available before subscribing?',
    answer:
      'Yes. We provide previews so you can decide whether the jobs suit your experience, industry and career goals before subscribing. We recommend reviewing the preview before buying.',
    category: 'subscription-and-payment',
  },
  {
    id: 21,
    question: "Should I subscribe if I don't see relevant opportunities in the preview?",
    answer:
      'No. Our advice is simple: review the preview first and subscribe only if you see enough relevance for your career goals.',
    category: 'subscription-and-payment',
  },
  {
    id: 22,
    question: 'How long does the subscription last?',
    answer:
      'It depends on the plan you choose at the time of purchase. Once you subscribe, you get access to the relevant vault for the full length of the selected period.',
    category: 'subscription-and-payment',
  },
  {
    id: 23,
    question: 'Can I cancel my subscription?',
    answer:
      'Yes. You can cancel at any time to stop future renewal, where it applies. However, we do not offer refunds. This is because access starts immediately when you subscribe and includes access to the available job database and previously gathered information from the moment your subscription begins.',
    category: 'subscription-and-payment',
  },
  {
    id: 24,
    question: "Why don't you offer refunds?",
    answer:
      'Because access is digital and immediate. As soon as you subscribe, you get access to the available job database and previously gathered information. This information cannot be returned like a physical product, so all subscriptions are non-refundable. You will be asked to accept this before paying. We strongly recommend reviewing the preview and choosing the right access before subscribing.',
    category: 'subscription-and-payment',
  },
  {
    id: 25,
    question: 'Is the subscription automatically renewed?',
    answer:
      'If automatic renewal applies to your plan, this will be clearly shown during the purchase process. You can cancel your subscription to stop future renewal.',
    category: 'subscription-and-payment',
  },

  // ── Payments ─────────────────────────────────────────────────────────
  {
    id: 26,
    question: 'What payment methods do you accept?',
    answer:
      'Payments are processed through our secure payment gateway, and the payment methods available to you are shown at checkout. Depending on your location and the gateway, these may include cards, UPI, net banking and other supported methods.',
    category: 'payments',
  },
  {
    id: 27,
    question: 'What happens if my auto-renewal payment fails?',
    answer:
      'If automatic renewal applies to your plan and the payment fails, you may receive a payment notification or reminder. If the renewal is not completed, access to the relevant vault may be paused or end once the current period finishes.',
    category: 'payments',
  },
  {
    id: 28,
    question: 'Will I receive a receipt or payment confirmation?',
    answer:
      'Yes. A payment confirmation is generated for successful payments. The payment or subscription details are also available through the payment or account system used for your purchase.',
    category: 'payments',
  },
  {
    id: 29,
    question: 'Do I need to confirm anything before completing payment?',
    answer:
      'Yes. Before paying, you must accept the subscription terms, including that the subscription is non-refundable.',
    category: 'payments',
  },

  // ── Access and Delivery ──────────────────────────────────────────────
  {
    id: 30,
    question: 'How do I receive access after payment?',
    answer:
      'After a successful payment, you receive instructions to access the relevant vault through the Gravitas Edge website. Access is usually provided immediately after payment.',
    category: 'access-and-delivery',
  },
  {
    id: 31,
    question: 'I paid but cannot access the opportunity vault. What should I do?',
    answer:
      'First, check your payment confirmation and the email linked to your purchase. If you have paid but still cannot access the relevant vault, contact the Gravitas Edge team and we will help fix the issue.',
    category: 'access-and-delivery',
  },
  {
    id: 32,
    question: 'Where are the opportunities posted?',
    answer:
      'The vaults are available through the Gravitas Edge website. Subscribers can access the vault that matches the plan they chose.',
    category: 'access-and-delivery',
  },
  {
    id: 33,
    question: 'Are opportunities posted every day?',
    answer:
      'No. The vault is updated on a regular basis, usually weekly, with extra jobs sometimes added on weekends or when relevant jobs become available. This is not a daily job-alert feed.',
    category: 'access-and-delivery',
  },
  {
    id: 34,
    question: "Why aren't opportunities posted every day?",
    answer:
      'Every job needs to be found, checked, selected and prepared before publishing. The aim is to give you relevant jobs with direct hiring contacts, not simply to post as many jobs as possible.',
    category: 'access-and-delivery',
  },
  {
    id: 35,
    question: 'How many jobs will I receive every week?',
    answer:
      'We do not guarantee a fixed number. The volume depends on the market, hiring activity, location, experience level and how many relevant jobs are available at the time. Some periods may have far more suitable jobs than others.',
    category: 'access-and-delivery',
  },
  {
    id: 36,
    question: 'Do you provide individual attention to every subscriber?',
    answer:
      'No. Gravitas Edge is a selected job-access service, not a one-to-one executive search or career consulting service. We do not currently provide profile promotion, personal job-search management or placement support.',
    category: 'access-and-delivery',
  },

  // ── Account and Website Access ───────────────────────────────────────
  {
    id: 37,
    question: 'How do I create a Gravitas Edge account?',
    answer:
      'You can create an account directly on the Gravitas Edge website using your email address. Creating an account is free and does not require a paid subscription. You need an account to subscribe to a vault.',
    category: 'account-and-website-access',
  },
  {
    id: 38,
    question: 'Can I access multiple vaults with one account?',
    answer:
      'Yes. Your account can hold access to more than one vault at the same time. For example, you may subscribe to an India vault and Global Access separately. Each subscription is managed individually within your account.',
    category: 'account-and-website-access',
  },
  {
    id: 39,
    question: 'Where can I see my subscription status and expiry date?',
    answer:
      'Your account dashboard shows your active access, subscription status and the relevant expiry or renewal information.',
    category: 'account-and-website-access',
  },
  {
    id: 40,
    question: 'Can I download or export the opportunity list?',
    answer:
      'No. The platform is designed for browsing and filtering jobs directly on the website. Bulk downloading or exporting the job database is not available. This helps protect the selected information and keeps the database inside the subscriber-only platform rather than being shared elsewhere.',
    category: 'account-and-website-access',
  },

  // ── International Opportunities ──────────────────────────────────────
  {
    id: 41,
    question: 'Can professionals outside India subscribe to Global Access?',
    answer:
      'Yes. Global Access is for professionals looking for jobs outside India and is not limited to Indian residents.',
    category: 'international-opportunities',
  },
  {
    id: 42,
    question: 'Which international markets do you cover?',
    answer:
      'The main focus is the Middle East, along with relevant jobs in other international markets. Coverage depends on market conditions and on suitable jobs being available with direct hiring contacts.',
    category: 'international-opportunities',
  },
  {
    id: 43,
    question: 'Can I use Global Access if I have no international experience?',
    answer:
      'Yes. International experience is not a requirement for Global Access. What matters is whether your profile meets the requirements of the individual job.',
    category: 'international-opportunities',
  },
  {
    id: 44,
    question: 'Do you arrange visas or work permits?',
    answer:
      'No. Visa sponsorship, work permits and immigration support are decided by the employer and the relevant immigration authorities. If a job clearly mentions sponsorship or relocation support, that may be shown in the job details. We do not provide immigration services.',
    category: 'international-opportunities',
  },

  // ── Applications and Employers ───────────────────────────────────────
  {
    id: 45,
    question: 'Who do I apply to after finding an opportunity?',
    answer:
      'You apply directly to the employer, recruiter, hiring manager or application channel shown in the job. Gravitas Edge does not send applications on your behalf.',
    category: 'applications-and-employers',
  },
  {
    id: 46,
    question: 'Does Gravitas Edge guarantee that a recruiter will respond?',
    answer:
      'No. Once you contact a recruiter or hiring manager, whether they respond is entirely up to them.',
    category: 'applications-and-employers',
  },
  {
    id: 47,
    question: 'Can I contact the hiring manager directly?',
    answer:
      'Yes. Where the hiring manager\u2019s contact details are available, you can use them to reach out directly. However, having a direct contact does not guarantee a response, interview or selection.',
    category: 'applications-and-employers',
  },
  {
    id: 48,
    question: 'What if a job has already closed?',
    answer:
      'Hiring status can change after a job is published. If you find that a job has closed, rely on the employer\u2019s latest information and application status. We work to keep the vault relevant, but no job-information service can guarantee that every opening stays active forever.',
    category: 'applications-and-employers',
  },
  {
    id: 49,
    question: 'Can I suggest a company or role that should be covered?',
    answer:
      'Yes. If you want us to watch a specific company, industry, location or type of role, share the requirement with the Gravitas Edge team. This does not guarantee that a matching job will be added, because we only publish jobs where suitable direct hiring contact details are available.',
    category: 'applications-and-employers',
  },

  // ── Services Not Currently Included ──────────────────────────────────
  {
    id: 50,
    question: 'Do you provide resume writing or CV assistance?',
    answer:
      'Not at present. This is not part of the subscription right now. We plan to add resume/CV assistance and other career-support services in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 51,
    question: 'Do you provide interview preparation?',
    answer:
      'Not at present. Interview preparation is not part of the subscription right now. Additional career-support services may be added in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 52,
    question: 'Do you provide career coaching?',
    answer:
      'Not at present. The current service focuses on job access and job-market information. Additional career-support services may be added in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 53,
    question: 'Do you provide executive coaching?',
    answer:
      'Not at present. Executive coaching is not part of the subscription right now. Additional services may be added in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 54,
    question: 'Do you guarantee interviews or job offers?',
    answer:
      'No. We provide access to jobs and direct hiring contacts. The decision to respond, interview or hire stays entirely with the employer or hiring team.',
    category: 'services-not-currently-included',
  },
  {
    id: 55,
    question: 'Do you apply for jobs on behalf of subscribers?',
    answer:
      'No. You are responsible for applying directly to employers, recruiters or hiring managers.',
    category: 'services-not-currently-included',
  },
  {
    id: 56,
    question: 'Do you negotiate salaries with employers?',
    answer:
      'No. Salary talks and negotiations happen directly between you and the employer or hiring representative.',
    category: 'services-not-currently-included',
  },
  {
    id: 57,
    question: 'Do you act as a recruitment agency?',
    answer:
      'No. Gravitas Edge does not represent candidates as a recruitment agency or guarantee placement.',
    category: 'services-not-currently-included',
  },
  {
    id: 58,
    question: 'Do you guarantee recruiter or hiring-manager access for every opportunity?',
    answer:
      'We only publish jobs where relevant direct hiring contact details are available. The contact may be a recruiter, hiring manager or another relevant hiring contact, depending on the job.',
    category: 'services-not-currently-included',
  },

  // ── Transparency ─────────────────────────────────────────────────────
  {
    id: 59,
    question: 'Is Gravitas Edge affiliated with the companies whose jobs you publish?',
    answer:
      'Not necessarily. Publishing a job does not mean Gravitas Edge is an authorised recruitment partner or representative of the employer. Unless clearly stated, treat Gravitas Edge as the source sharing selected job information, not as the employer\u2019s recruitment representative.',
    category: 'transparency',
  },
  {
    id: 60,
    question: 'Do I pay Gravitas Edge to get hired by a company?',
    answer:
      'No. Your subscription payment is for access to Gravitas Edge\u2019s job and hiring-information service. You should never be asked to pay an employer or recruiter simply to get a job offer.',
    category: 'transparency',
  },
  {
    id: 61,
    question: 'How do I know whether a recruiter contact is genuine?',
    answer:
      'We make reasonable efforts to check the information available to us before publishing a job. However, you should independently verify the recruiter\u2019s identity and the employer\u2019s details before sharing sensitive personal information or making any payment.',
    category: 'transparency',
  },
  {
    id: 62,
    question: "Why don't you publish every recruiter contact publicly?",
    answer:
      'Direct hiring contacts are a key part of the value of paid access. Publishing every contact publicly would remove the difference between the free preview and the paid service.',
    category: 'transparency',
  },
  {
    id: 63,
    question: "Why don't you publish the complete job details publicly?",
    answer:
      'Our free channels and public content share selected jobs, previews and job-market information. Paid access provides the fuller job details and direct hiring contact information.',
    category: 'transparency',
  },

  // ── Getting the Most Value from the Vault ────────────────────────────
  {
    id: 64,
    question: 'How should I use the opportunity vault?',
    answer:
      'The vault works best when you actively use the information. We recommend: review jobs relevant to your experience, read the full job requirements, identify the right hiring contact, use the recruiter or hiring-manager contact provided, tailor your application to the specific role, and apply promptly because hiring requirements can change.',
    category: 'getting-the-most-value',
  },
  {
    id: 65,
    question: 'Is Gravitas Edge suitable for everyone?',
    answer:
      'No. It is most useful for professionals who are actively exploring career opportunities and want selected access to relevant openings and direct hiring contacts. If you want someone to apply on your behalf, guarantee placement or provide one-to-one recruitment services, this service is not for you.',
    category: 'getting-the-most-value',
  },
  {
    id: 66,
    question:
      'What is the biggest difference between the free content and paid opportunity access?',
    answer:
      'Our free content shares selected jobs, previews and job-market information. Paid access gives you the relevant vault, including the fuller job details and direct hiring contact information.',
    category: 'getting-the-most-value',
  },
  {
    id: 67,
    question: 'Can I subscribe to multiple access categories?',
    answer:
      'Yes, where the available options allow it. For example, you may choose an India vault based on your experience while separately seeking international jobs through Global Access.',
    category: 'getting-the-most-value',
  },
  {
    id: 68,
    question: 'What if I am between two experience categories?',
    answer:
      'Choose the category that best matches your current career stage and the type of roles you want. If your main goal is international jobs, Global Access is open to all experience levels and may be the better fit.',
    category: 'getting-the-most-value',
  },

  // ── Previous Subscribers and Website Transition ──────────────────────
  {
    id: 69,
    question: 'I was previously a subscriber through Telegram. Do I need to do anything?',
    answer:
      'If you were an active subscriber through the old Telegram-based system, you will receive instructions on setting up your Gravitas Edge website account and transferring or confirming your existing access during the move to the website and the removal of the old Telegram system.',
    category: 'previous-subscribers',
  },
  {
    id: 70,
    question: 'Will I lose access during the move to the website?',
    answer:
      'Existing active subscribers keep access for the duration of their existing subscription. If you face any access issue during the move, contact the Gravitas Edge team and we will help resolve it.',
    category: 'previous-subscribers',
  },
  {
    id: 71,
    question:
      'I already paid through the previous payment platform. Is my subscription still valid?',
    answer:
      'Yes. If you have an active subscription bought through the previous payment system, it remains valid for the length you originally paid for. Once it expires, any renewal will happen through the Gravitas Edge website.',
    category: 'previous-subscribers',
  },

  // ── Legal and Policies ───────────────────────────────────────────────
  {
    id: 72,
    question: 'Where can I find your Terms of Service, Privacy Policy and Refund Policy?',
    answer:
      'The Terms of Service, Privacy Policy and Refund Policy are available in the footer of the Gravitas Edge website and are also linked at the relevant stages of the subscription and payment process. We recommend reviewing these before completing a subscription.',
    category: 'legal-and-policies',
  },
  {
    id: 73,
    question: "I have a question that isn't answered here. What should I do?",
    answer:
      'Contact the Gravitas Edge team with your question. Before subscribing, we recommend reviewing the preview and choosing the access category that best matches your experience level and target market. Gravitas Edge is built around a simple principle: Better opportunities. Better access. Better information. Our goal is not to promise a job. It is to give professionals better access to relevant opportunities and the direct hiring information they need to pursue them.',
    category: 'legal-and-policies',
  },
];
