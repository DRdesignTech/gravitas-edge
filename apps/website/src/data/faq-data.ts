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
      'Gravitas Edge Consulting provides curated career opportunities and hiring-market intelligence for professionals across India and international markets. We identify relevant opportunities, curate and validate the available information, and provide subscribers with access to opportunity details and direct recruiter or hiring-manager contact information. Our model is designed to give professionals better access to relevant opportunities without acting as a recruitment agency or placement service.',
    category: 'about-gravitas-edge',
  },
  {
    id: 2,
    question: 'What exactly do I get with a Gravitas Edge subscription?',
    answer:
      'Depending on the access you subscribe to, you receive: curated job opportunities relevant to your experience level or target geography, complete opportunity details, direct recruiter or hiring-manager contact information, application instructions and relevant contact details, access to the applicable opportunity vault, and relevant hiring-market intelligence and opportunity updates. We only publish opportunities where a relevant direct hiring contact is available.',
    category: 'about-gravitas-edge',
  },
  {
    id: 3,
    question: 'Is Gravitas Edge a recruitment agency?',
    answer:
      'No. Gravitas Edge is an opportunity and hiring-intelligence platform. We do not represent candidates to employers, guarantee interviews, or act as a placement agency. Applications are made directly by candidates to the relevant employer, recruiter or hiring contact.',
    category: 'about-gravitas-edge',
  },
  {
    id: 4,
    question: 'Do you provide direct placement or job guarantees?',
    answer:
      'No. We do not guarantee a job, interview, shortlist, offer or placement. What we provide is access to curated opportunities and direct hiring contacts that can help you approach relevant opportunities more effectively.',
    category: 'about-gravitas-edge',
  },
  {
    id: 5,
    question: 'Do you provide resume/CV assistance?',
    answer:
      'Not at present. Resume writing, CV preparation and related career-support services are not currently part of the subscription. Additional career-support services may be introduced in the future.',
    category: 'about-gravitas-edge',
  },

  // ── Opportunity Vaults ───────────────────────────────────────────────
  {
    id: 6,
    question: 'What opportunity vaults are available?',
    answer:
      'Our current structure includes India Opportunities: Career Access (0\u20135 years), Professional Access (5\u201310 years), Leadership Access (10\u201315 years), and Executive Access (15+ years). Global Opportunities include Global Access (all experience levels) for professionals seeking opportunities outside India, with a primary focus on the Middle East and other international markets.',
    category: 'opportunity-vaults',
  },
  {
    id: 7,
    question: 'How do I know which India vault is right for me?',
    answer:
      'Choose your India access primarily based on your total professional experience: 0\u20135 years for Career Access, 5\u201310 years for Professional Access, 10\u201315 years for Leadership Access, and 15+ years for Executive Access. The experience bands are designed to keep opportunities broadly relevant to your career stage. Actual requirements will vary by individual role.',
    category: 'opportunity-vaults',
  },
  {
    id: 8,
    question: 'Does Global Access have an experience limit?',
    answer:
      'No. Global Access is open to professionals at all experience levels. It is intended for candidates targeting opportunities outside India, with a primary focus on the Middle East and other international markets.',
    category: 'opportunity-vaults',
  },
  {
    id: 9,
    question: 'Does Global Access only contain Middle East jobs?',
    answer:
      'No. The Middle East is the primary focus, but Global Access can also include relevant opportunities in other international markets.',
    category: 'opportunity-vaults',
  },

  // ── Jobs and Opportunities ───────────────────────────────────────────
  {
    id: 10,
    question: 'Where do the opportunities come from?',
    answer:
      'Opportunities are sourced through multiple channels and reviewed before being added to the relevant vault. Depending on the opportunity, information may come from employers, recruiters, professional networks, hiring channels and other credible sources.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 11,
    question: 'Are the jobs verified?',
    answer:
      'We curate and validate opportunities before publishing them based on the information available to us. A key part of our curation process is the availability of a direct hiring contact. We only publish opportunities where we have a relevant recruiter, hiring manager or other direct hiring contact available. Hiring situations can still change quickly \u2014 a company may close a role, pause hiring, change requirements or stop accepting applications after an opportunity has been published.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 12,
    question: 'Are these real jobs or just job links collected from job portals?',
    answer:
      'The purpose of Gravitas Edge is not simply to reproduce generic job-board listings. We focus on opportunities where we have access to relevant direct hiring contact information, allowing subscribers to approach the opportunity through a more direct route. The value of the service is the curation, relevance and direct hiring access, rather than simply providing a list of job links.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 13,
    question: 'Will every job have a recruiter or hiring-manager contact?',
    answer:
      'Yes. We only publish opportunities where direct contact information is available. Depending on the opportunity, the contact may be a recruiter, hiring manager or another relevant person involved in the hiring process. If we do not have an appropriate direct hiring contact for an opportunity, we do not add that opportunity to the vault.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 14,
    question: 'Can I apply directly to the hiring manager or recruiter?',
    answer:
      'Yes. Where a direct hiring contact is provided, you can use the information to approach the relevant person directly. The opportunity will also include the available application instructions where applicable.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 15,
    question: 'Do you contact recruiters on my behalf?',
    answer:
      'No. Gravitas Edge provides the opportunity and direct hiring contact information. Candidates are responsible for contacting recruiters, hiring managers or employers and submitting their applications.',
    category: 'jobs-and-opportunities',
  },
  {
    id: 16,
    question: 'Can you promote my profile to recruiters?',
    answer:
      'No. The subscription does not currently include individual candidate promotion, candidate marketing or direct placement services.',
    category: 'jobs-and-opportunities',
  },

  // ── Subscription and Payment ─────────────────────────────────────────
  {
    id: 17,
    question: 'Do I have to pay to apply for a job?',
    answer:
      'No. You do not pay the employer or recruiter to apply for a job. Gravitas Edge is a paid subscription service that provides access to curated opportunities and direct hiring information. The subscription is for access to the service, not a fee for applying to an individual job.',
    category: 'subscription-and-payment',
  },
  {
    id: 18,
    question: 'Why should I pay for access when jobs are available online for free?',
    answer:
      'Many job openings are publicly visible. The difference is that Gravitas Edge focuses on curation, relevance and direct hiring access. We specifically focus on opportunities where relevant recruiter or hiring-contact information is available, which can save candidates the time and effort of independently searching for both the opportunity and the right person to approach. If you are comfortable independently searching job boards and identifying relevant hiring contacts yourself, you may not need a paid opportunity-access service.',
    category: 'subscription-and-payment',
  },
  {
    id: 19,
    question: 'Is the subscription a payment for a guaranteed job?',
    answer:
      'No. You are paying for access to the Gravitas Edge opportunity vault and its curated information. There is no payment for a guaranteed interview, shortlist, job offer or placement.',
    category: 'subscription-and-payment',
  },
  {
    id: 20,
    question: 'Can I see what kind of opportunities are available before subscribing?',
    answer:
      'Yes. We provide previews so that you can assess whether the opportunities are relevant to your experience, industry and career objectives before subscribing. We recommend reviewing the available preview before purchasing.',
    category: 'subscription-and-payment',
  },
  {
    id: 21,
    question: "Should I subscribe if I don't see relevant opportunities in the preview?",
    answer:
      'No. Our recommendation is straightforward: review the preview first and subscribe only if you see sufficient relevance for your career objectives.',
    category: 'subscription-and-payment',
  },
  {
    id: 22,
    question: 'How long does the subscription last?',
    answer:
      'The subscription period depends on the plan selected at the time of purchase. Once you subscribe, you receive access to the applicable opportunity vault for the full duration of the selected subscription period.',
    category: 'subscription-and-payment',
  },
  {
    id: 23,
    question: 'Can I cancel my subscription?',
    answer:
      'Yes. You can cancel your subscription at any time to prevent future renewal, where applicable. However, we do not offer refunds. This is because access is provided immediately upon subscription and includes access to the available opportunity database and previously collated information from the moment your subscription begins.',
    category: 'subscription-and-payment',
  },
  {
    id: 24,
    question: "Why don't you offer refunds?",
    answer:
      'Our business model is based on immediate digital access. Once you subscribe, you receive immediate access to the available opportunity database and previously collated information. This information cannot be returned or withdrawn in the same way as a physical product. For this reason, all subscriptions are non-refundable. You will be asked to acknowledge and accept this condition before completing your payment. We strongly recommend reviewing the available preview and selecting the appropriate access before subscribing.',
    category: 'subscription-and-payment',
  },
  {
    id: 25,
    question: 'Is the subscription automatically renewed?',
    answer:
      'If automatic renewal applies to your selected plan, this will be clearly indicated during the purchase process. You can cancel your subscription to prevent future renewal.',
    category: 'subscription-and-payment',
  },

  // ── Payments ─────────────────────────────────────────────────────────
  {
    id: 26,
    question: 'What payment methods do you accept?',
    answer:
      'Payments are processed through our secure payment gateway and the payment methods available to you will be displayed at checkout. Depending on your location and the payment gateway, available methods may include cards, UPI, net banking and other supported payment methods.',
    category: 'payments',
  },
  {
    id: 27,
    question: 'What happens if my auto-renewal payment fails?',
    answer:
      'If automatic renewal applies to your plan and the renewal payment fails, you may receive a payment notification or renewal reminder. If the renewal is not completed, access to the relevant opportunity vault may be paused or expire once the existing subscription period ends.',
    category: 'payments',
  },
  {
    id: 28,
    question: 'Will I receive a receipt or payment confirmation?',
    answer:
      'Yes. A payment confirmation is generated for successful transactions. The applicable payment or subscription information will also be available through the payment or account system used for your purchase.',
    category: 'payments',
  },
  {
    id: 29,
    question: 'Do I need to confirm anything before completing payment?',
    answer:
      'Yes. Before completing payment, you will be required to acknowledge the applicable subscription terms, including the non-refundable nature of the subscription.',
    category: 'payments',
  },

  // ── Access and Delivery ──────────────────────────────────────────────
  {
    id: 30,
    question: 'How do I receive access after payment?',
    answer:
      'After successful payment, you will receive instructions to access the relevant opportunity vault through the Gravitas Edge website. Access is generally provided immediately after successful payment.',
    category: 'access-and-delivery',
  },
  {
    id: 31,
    question: 'I paid but cannot access the opportunity vault. What should I do?',
    answer:
      'First, check your payment confirmation and the email associated with your purchase. If you have completed payment but cannot access the relevant opportunity vault, contact the Gravitas Edge team and we will help resolve the access issue.',
    category: 'access-and-delivery',
  },
  {
    id: 32,
    question: 'Where are the opportunities posted?',
    answer:
      'The opportunity vaults are available through the Gravitas Edge website. Subscribers can access the relevant vault based on the subscription they have selected.',
    category: 'access-and-delivery',
  },
  {
    id: 33,
    question: 'Are opportunities posted every day?',
    answer:
      'No. The vault is updated on a regular basis, generally on a weekly cycle, with additional opportunities sometimes added during weekends or when relevant opportunities become available. We do not position the service as a daily job-alert feed.',
    category: 'access-and-delivery',
  },
  {
    id: 34,
    question: "Why aren't opportunities posted every day?",
    answer:
      'Each opportunity needs to be sourced, reviewed, curated and prepared before publication. The objective is to provide relevant opportunities with direct hiring contacts rather than simply maximize the number of posts.',
    category: 'access-and-delivery',
  },
  {
    id: 35,
    question: 'How many jobs will I receive every week?',
    answer:
      'We do not guarantee a fixed number of opportunities. The volume depends on the market, hiring activity, geography, experience level and the number of relevant positions available at any given time. Some periods may have significantly more suitable opportunities than others.',
    category: 'access-and-delivery',
  },
  {
    id: 36,
    question: 'Do you provide individual attention to every subscriber?',
    answer:
      'No. Gravitas Edge is a curated opportunity-access service, not a one-to-one executive search or career consulting service. We do not currently provide individual candidate promotion, personal job-search management or direct placement support.',
    category: 'access-and-delivery',
  },

  // ── Account and Website Access ───────────────────────────────────────
  {
    id: 37,
    question: 'How do I create a Gravitas Edge account?',
    answer:
      'You can create an account directly on the Gravitas Edge website using your email address. Account creation is free and does not require a paid subscription. An active account is required to subscribe to an opportunity vault.',
    category: 'account-and-website-access',
  },
  {
    id: 38,
    question: 'Can I access multiple vaults with one account?',
    answer:
      'Yes. Your account can hold access to more than one opportunity vault at the same time. For example, you may subscribe to an India-based access category and Global Access separately. Each subscription is managed independently within your account.',
    category: 'account-and-website-access',
  },
  {
    id: 39,
    question: 'Where can I see my subscription status and expiry date?',
    answer:
      'Your account dashboard allows you to view your active access, subscription status and applicable expiry or renewal information.',
    category: 'account-and-website-access',
  },
  {
    id: 40,
    question: 'Can I download or export the opportunity list?',
    answer:
      'No. The platform is designed for browsing and filtering opportunities directly through the website. Bulk downloading or exporting the opportunity database is not available. This helps protect the integrity of the curated information and ensures that the database remains part of the subscriber-only platform rather than being redistributed outside it.',
    category: 'account-and-website-access',
  },

  // ── International Opportunities ──────────────────────────────────────
  {
    id: 41,
    question: 'Can professionals outside India subscribe to Global Access?',
    answer:
      'Yes. Global Access is designed for professionals seeking opportunities outside India and is not restricted to Indian residents.',
    category: 'international-opportunities',
  },
  {
    id: 42,
    question: 'Which international markets do you cover?',
    answer:
      'The primary focus is the Middle East, along with relevant opportunities in other international markets. Coverage depends on market conditions and the availability of suitable opportunities with direct hiring contacts.',
    category: 'international-opportunities',
  },
  {
    id: 43,
    question: 'Can I use Global Access if I have no international experience?',
    answer:
      'Yes. International experience is not a requirement for Global Access. The relevant consideration is whether your profile meets the eligibility requirements of the individual opportunity.',
    category: 'international-opportunities',
  },
  {
    id: 44,
    question: 'Do you arrange visas or work permits?',
    answer:
      'No. Visa sponsorship, work permits and immigration support are determined by the employer and applicable immigration authorities. Where an opportunity explicitly mentions sponsorship or relocation support, that information may be included in the opportunity details. We do not provide immigration services.',
    category: 'international-opportunities',
  },

  // ── Applications and Employers ───────────────────────────────────────
  {
    id: 45,
    question: 'Who do I apply to after finding an opportunity?',
    answer:
      'You apply directly to the employer, recruiter, hiring manager or application channel specified in the opportunity. Gravitas Edge does not submit applications on behalf of subscribers.',
    category: 'applications-and-employers',
  },
  {
    id: 46,
    question: 'Does Gravitas Edge guarantee that a recruiter will respond?',
    answer:
      'No. Once you contact a recruiter or hiring manager, the response is entirely at their discretion.',
    category: 'applications-and-employers',
  },
  {
    id: 47,
    question: 'Can I contact the hiring manager directly?',
    answer:
      'Yes. Where a hiring manager\u2019s contact information is available, you can use it to approach them directly. However, having a direct contact does not guarantee a response, interview or selection.',
    category: 'applications-and-employers',
  },
  {
    id: 48,
    question: 'What if a job has already closed?',
    answer:
      'Hiring status can change after an opportunity is published. If you discover that an opportunity has closed, you should rely on the employer\u2019s latest information and application status. We work to keep the vault relevant, but no job-information service can guarantee that every opening remains active indefinitely after publication.',
    category: 'applications-and-employers',
  },
  {
    id: 49,
    question: 'Can I suggest a company or role that should be covered?',
    answer:
      'Yes. If you have a specific company, industry, geography or type of role you want us to monitor, you can share the requirement with the Gravitas Edge team. This does not guarantee that a matching opportunity will be added, as we only publish opportunities where suitable direct hiring contact information is available.',
    category: 'applications-and-employers',
  },

  // ── Services Not Currently Included ──────────────────────────────────
  {
    id: 50,
    question: 'Do you provide resume writing or CV assistance?',
    answer:
      'Not at present. This is not currently part of the subscription. We plan to introduce resume/CV assistance and additional career-support services in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 51,
    question: 'Do you provide interview preparation?',
    answer:
      'Not at present. Interview preparation is not currently part of the subscription. Additional career-support services may be introduced in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 52,
    question: 'Do you provide career coaching?',
    answer:
      'Not at present. The current service focuses on opportunity access and hiring-market intelligence. Additional career-support services may be introduced in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 53,
    question: 'Do you provide executive coaching?',
    answer:
      'Not at present. Executive coaching is not currently part of the subscription. Additional services may be introduced in the future.',
    category: 'services-not-currently-included',
  },
  {
    id: 54,
    question: 'Do you guarantee interviews or job offers?',
    answer:
      'No. We provide access to opportunities and direct hiring contacts. The decision to respond, interview or hire remains entirely with the employer or hiring team.',
    category: 'services-not-currently-included',
  },
  {
    id: 55,
    question: 'Do you apply for jobs on behalf of subscribers?',
    answer:
      'No. Candidates are responsible for applying directly to employers, recruiters or hiring managers.',
    category: 'services-not-currently-included',
  },
  {
    id: 56,
    question: 'Do you negotiate salaries with employers?',
    answer:
      'No. Salary discussions and negotiations take place directly between the candidate and the employer or hiring representative.',
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
      'We only publish opportunities where relevant direct hiring contact information is available. The contact may be a recruiter, hiring manager or another relevant hiring contact depending on the opportunity.',
    category: 'services-not-currently-included',
  },

  // ── Transparency ─────────────────────────────────────────────────────
  {
    id: 59,
    question: 'Is Gravitas Edge affiliated with the companies whose jobs you publish?',
    answer:
      'Not necessarily. Publishing an opportunity does not mean that Gravitas Edge is an authorised recruitment partner or representative of the employer. Unless explicitly stated, candidates should treat Gravitas Edge as the source providing curated opportunity information, not as the employer\u2019s recruitment representative.',
    category: 'transparency',
  },
  {
    id: 60,
    question: 'Do I pay Gravitas Edge to get hired by a company?',
    answer:
      'No. Your subscription payment is for access to Gravitas Edge\u2019s opportunity and hiring-intelligence service. You should never be required to pay an employer or recruiter simply to obtain a job offer.',
    category: 'transparency',
  },
  {
    id: 61,
    question: 'How do I know whether a recruiter contact is genuine?',
    answer:
      'We make reasonable efforts to validate the information available to us before publishing an opportunity. However, candidates should independently verify recruiter identity and employer details before sharing sensitive personal information or making any payment.',
    category: 'transparency',
  },
  {
    id: 62,
    question: "Why don't you publish every recruiter contact publicly?",
    answer:
      'Direct hiring contacts are an important part of the value provided through the paid opportunity access. Publicly publishing every contact would remove the distinction between the free preview and the paid service.',
    category: 'transparency',
  },
  {
    id: 63,
    question: "Why don't you publish the complete job details publicly?",
    answer:
      'Our free channels and public content are designed to provide selected opportunities, previews and hiring-market intelligence. Paid opportunity access provides the fuller opportunity information and direct hiring contact details.',
    category: 'transparency',
  },

  // ── Getting the Most Value from the Vault ────────────────────────────
  {
    id: 64,
    question: 'How should I use the opportunity vault?',
    answer:
      'The vault works best when you actively use the information provided. We recommend: review opportunities relevant to your experience, read the complete job requirements, identify the most appropriate hiring contact, use the recruiter or hiring-manager contact provided, tailor your application to the specific role, and apply promptly because hiring requirements can change.',
    category: 'getting-the-most-value',
  },
  {
    id: 65,
    question: 'Is Gravitas Edge suitable for everyone?',
    answer:
      'No. It is most useful for professionals who are actively exploring career opportunities and want curated access to relevant openings and direct hiring contacts. If you are looking for someone to apply for jobs on your behalf, guarantee placement or provide one-to-one recruitment services, this service is not designed for you.',
    category: 'getting-the-most-value',
  },
  {
    id: 66,
    question:
      'What is the biggest difference between the free content and paid opportunity access?',
    answer:
      'Our free content provides selected opportunities, previews and hiring-market intelligence. Paid access provides the relevant opportunity vault, including the fuller opportunity information and direct hiring contact details.',
    category: 'getting-the-most-value',
  },
  {
    id: 67,
    question: 'Can I subscribe to multiple access categories?',
    answer:
      'Yes, where the available subscription options allow it. For example, a professional may choose an India access category based on experience while separately seeking international opportunities through Global Access.',
    category: 'getting-the-most-value',
  },
  {
    id: 68,
    question: 'What if I am between two experience categories?',
    answer:
      'Choose the access category that best matches your current career stage and the type of roles you are targeting. If your primary objective is to target international opportunities, Global Access is open to all experience levels and may be more appropriate.',
    category: 'getting-the-most-value',
  },

  // ── Previous Subscribers and Website Transition ──────────────────────
  {
    id: 69,
    question: 'I was previously a subscriber through Telegram. Do I need to do anything?',
    answer:
      'If you were an active subscriber through the previous Telegram-based delivery system, you will receive instructions on setting up your Gravitas Edge website account and transferring or confirming your existing access during the transition to the Gravitas Edge website and removing the old Telegram-based system.',
    category: 'previous-subscribers',
  },
  {
    id: 70,
    question: 'Will I lose access during the move to the website?',
    answer:
      'Existing active subscribers will retain access for the duration of their existing subscription. If you experience any access issue during the transition, contact the Gravitas Edge team and we will assist with resolving it.',
    category: 'previous-subscribers',
  },
  {
    id: 71,
    question:
      'I already paid through the previous payment platform. Is my subscription still valid?',
    answer:
      'Yes. If you have an active subscription purchased through the previous payment system, it remains valid for the duration originally purchased. Once that subscription expires, any renewal will take place through the Gravitas Edge website.',
    category: 'previous-subscribers',
  },

  // ── Legal and Policies ───────────────────────────────────────────────
  {
    id: 72,
    question: 'Where can I find your Terms of Service, Privacy Policy and Refund Policy?',
    answer:
      'The applicable Terms of Service, Privacy Policy and Refund Policy are available through the Gravitas Edge website footer and are also linked at the relevant stages of the subscription and payment process. We recommend reviewing these policies before completing a subscription.',
    category: 'legal-and-policies',
  },
  {
    id: 73,
    question: "I have a question that isn't answered here. What should I do?",
    answer:
      'Contact the Gravitas Edge team with your specific question. Before subscribing, we recommend reviewing the available preview and choosing the access category that best matches your experience level and target market. Gravitas Edge is built around a simple principle: Better opportunities. Better access. Better information. The goal is not to promise a job. The goal is to give professionals better access to relevant opportunities and the direct hiring information they need to pursue them.',
    category: 'legal-and-policies',
  },
];
