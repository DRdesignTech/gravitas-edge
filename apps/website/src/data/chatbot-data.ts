/**
 * Static chatbot knowledge base for the Gravitas Edge website prototype.
 *
 * This file holds ALL questions, answers, greetings and the simple matching
 * logic used until a real AI / API backend is wired in. The chatbot UI
 * component never hard-codes content — it only reads this module.
 *
 * Later this STATIC DATA → API DATA swap can be done here without touching
 * the UI component (e.g. `chatbotTopics` fetched from an endpoint and
 * `matchCustomQuestion` replaced by a server call).
 */

export interface ChatAction {
  label: string;
  href: string;
}

export interface ChatTopic {
  id: string;
  label: string;
  question: string;
  answer: string;
  keywords: string[];
  actions?: ChatAction[];
}

/** The welcome message shown when the chatbot first opens. */
export const chatbotWelcome =
  'Hi! 👋 Welcome to Gravitas Edge.\nHow can I help you today?';

/** The reply shown when the user types a simple greeting. */
export const chatbotGreetingReply = 'Hi! 👋 How can I help you today?';

/** The reply shown when the chatbot cannot answer a custom question. */
export const chatbotFallbackReply =
  "Sorry, I don't have an answer for that yet. Please choose one of the questions below or contact our support team for help.";

/** Contact details used by the "Contact Support" paths. */
export const chatbotContact = {
  email: 'enquiry@gravitasedgeconsulting.com',
  whatsappUrl: 'https://wa.me/message/5JALY3QF6BTKC1',
  pageUrl: '/contact',
};

/** The "Ask your own question" option label. */
export const askOwnQuestionLabel = 'Ask your own question';

/** The "Contact Support" option label shown after a fallback reply. */
export const contactSupportLabel = 'Contact Support';

export const chatbotTopics: ChatTopic[] = [
  {
    id: 'what-is',
    label: 'What is Gravitas Edge?',
    question: 'What is Gravitas Edge?',
    answer:
      'Gravitas Edge shares job opportunities and what employers are looking for with professionals in India and other countries. We find relevant jobs, check the information we share, and give subscribers the job details plus the recruiter or hiring manager\u2019s contact details. It is an information service \u2014 not a recruitment agency or placement service.',
    keywords: [
      'what is gravitas edge',
      'what is gravitas',
      'about gravitas edge',
      'about gravitas',
      'tell me about gravitas',
      'tell me about you',
    ],
  },
  {
    id: 'how-it-works',
    label: 'How does Gravitas Edge work?',
    question: 'How does Gravitas Edge work?',
    answer:
      'Gravitas Edge finds and selects jobs across many channels, checks each one, and only publishes a job when we have a relevant direct hiring contact (a recruiter or hiring manager). Subscribers choose an Opportunity Vault that matches their experience or target location, see the full job details, and apply directly to the hiring contact. You apply yourself \u2014 we do not apply on your behalf.',
    keywords: [
      'how does gravitas edge work',
      'how does gravitas work',
      'how does it work',
      'how do you work',
      'how it works',
      'process',
      'work',
      'works',
    ],
  },
  {
    id: 'vaults',
    label: 'What are Opportunity Vaults?',
    question: 'What are Opportunity Vaults?',
    answer:
      'Opportunity Vaults are selected collections of jobs grouped by location and experience level. India vaults: Career Access (0\u20135 years), Professional Access (5\u201310 years), Leadership Access (10\u201315 years) and Executive Access (15+ years). For jobs outside India there is Global Access (all experience levels), with a main focus on the Middle East and other international markets.',
    keywords: [
      'opportunity vault',
      'opportunity vaults',
      'vault',
      'vaults',
      'career access',
      'professional access',
      'leadership access',
      'executive access',
      'global access',
      'which vault',
      'types of vault',
    ],
  },
  {
    id: 'access',
    label: 'How do I access opportunities?',
    question: 'How do I access opportunities?',
    answer:
      'You can access opportunities through the Gravitas Edge website. Create a free account, subscribe to the Opportunity Vault that matches your experience level or target location, and the relevant vault becomes available in your account dashboard \u2014 usually immediately after payment. You can review the preview before subscribing, then browse jobs and apply directly using the contact details shown.',
    keywords: [
      'how do i access',
      'how can i access',
      'access opportunities',
      'access the vault',
      'access my vault',
      'get access',
      'cannot access',
      "can't access",
      'i paid',
      'paid',
      'access',
      'login',
      'log in',
      'sign in',
    ],
  },
  {
    id: 'cost',
    label: 'How much does it cost?',
    question: 'How much does it cost?',
    answer:
      'Gravitas Edge charges for paid access to the Vaults \u2014 you choose an Opportunity Vault and an access period (plans with different durations, including discounted prices where available). You never pay an employer or recruiter to apply for a job. For the current Vault plans and prices, please see the Plans section on our website.',
    keywords: [
      'how much does it cost',
      'how much',
      'cost',
      'price',
      'pricing',
      'prices',
      'plans',
      'plan',
      'pay',
      'payment',
      'subscription',
      'fee',
      'expensive',
      'charge',
      'rates',
      'money',
    ],
    actions: [{ label: 'View Plans', href: '/plans' }],
  },
  {
    id: 'contact',
    label: 'How can I contact Gravitas Edge?',
    question: 'How can I contact Gravitas Edge?',
    answer:
      `You can reach the Gravitas Edge team at ${chatbotContact.email} or through WhatsApp support. For full contact, complaints and grievance redressal details, visit the Contact Us page on our website.`,
    keywords: [
      'contact',
      'contacts',
      'contact us',
      'reach',
      'reach out',
      'get in touch',
      'email',
      'support',
      'whatsapp',
      'phone',
      'call',
      'complaint',
      'talk to someone',
    ],
    actions: [
      { label: 'Email us', href: `mailto:${chatbotContact.email}` },
      { label: 'WhatsApp support', href: chatbotContact.whatsappUrl },
      { label: 'Contact Us page', href: chatbotContact.pageUrl },
    ],
  },
  {
    id: 'resume',
    label: 'How do I submit my resume?',
    question: 'How do I submit my resume?',
    answer:
      'You can upload your CV or resume directly on our Upload Resume page as a guest or logged-in member (PDF, DOC, DOCX up to 5MB). Our system automatically extracts your contact details and experience to pre-fill your profile. When you register with the same email, your uploaded resume links to your account automatically.',
    keywords: [
      'resume',
      'cv',
      'upload resume',
      'submit resume',
      'upload cv',
      'send cv',
      'profile',
    ],
    actions: [{ label: 'Upload Resume', href: '/upload-resume' }],
  },
  {
    id: 'register',
    label: 'How do I register for free?',
    question: 'How do I register for free?',
    answer:
      'Creating an account on Gravitas Edge is completely free — no credit card or payment required. Sign up to explore executive mandates, view live opportunity previews, and track your applications.',
    keywords: [
      'register',
      'signup',
      'sign up',
      'create account',
      'join',
      'new account',
    ],
    actions: [{ label: 'Create Free Account', href: '/register' }],
  },
  {
    id: 'bundle',
    label: 'What is the 20% Bundle discount?',
    question: 'What is the 20% Bundle discount?',
    answer:
      'Our Build Your Bundle promotion allows you to combine an India Opportunity Vault with a Global & UAE Vault in one seamless checkout to receive an automatic 20% recurring discount for as long as both stay active.',
    keywords: [
      'bundle',
      'discount',
      'offer',
      'promo',
      'coupon',
      '20% off',
      'save 20',
      'special offer',
    ],
    actions: [{ label: 'Build Your Bundle', href: '/plans' }],
  },
  {
    id: 'referrals',
    label: 'How does Refer & Earn work?',
    question: 'How does Refer & Earn work?',
    answer:
      'Share Gravitas Edge with senior colleagues using your unique referral link from your dashboard. When they subscribe to an Opportunity Vault, you earn recurring commissions credited directly to your digital partner wallet (Tier 1: 10%, Tier 2: 15%, Tier 3: 20%).',
    keywords: [
      'refer',
      'referral',
      'refer and earn',
      'affiliate',
      'commission',
      'wallet',
      'earn money',
    ],
    actions: [{ label: 'Refer & Earn', href: '/refer-and-earn' }],
  },
];

const simpleGreetings = [
  'hi',
  'hello',
  'hey',
  'good morning',
  'good afternoon',
  'good evening',
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?!.,]+$/g, '');
}

/** True when the text is (or starts with) a friendly greeting. */
export function isGreeting(text: string): boolean {
  const t = normalizeText(text);
  if (!t) return false;
  const wordCount = t.split(' ').length;

  for (const greeting of simpleGreetings) {
    if (t === greeting) return true;
    if (!t.startsWith(`${greeting} `)) continue;
    // Multi-word greetings (good morning/afternoon/evening) can open longer
    // messages and still be a greeting.
    if (greeting.includes(' ')) return true;
    // Single-word greetings only count when the message stays very short,
    // so real questions like "hello does it cost money" still get matched.
    if (wordCount <= 4) return true;
  }

  return false;
}

/**
 * Simple keyword-based matcher used while there is no AI/API.
 * Returns the predefined topic whose answer fits best, or null when none.
 */
export function matchCustomQuestion(text: string): ChatTopic | null {
  const t = normalizeText(text);
  if (!t) return null;

  let best: ChatTopic | null = null;
  let bestScore = 0;

  for (const topic of chatbotTopics) {
    let score = 0;
    for (const keyword of topic.keywords) {
      const k = normalizeText(keyword);
      if (!k) continue;
      if (t.includes(k)) {
        score += k.includes(' ') ? 3 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }

  return bestScore > 0 ? best : null;
}