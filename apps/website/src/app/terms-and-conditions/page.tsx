import type { Metadata } from 'next';
import PolicyLayout, {
  PolicyContactBlock,
  PolicyList,
  PolicySection,
  PolicySubheading,
  PolicyText,
} from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Gravitas Edge',
  description:
    'Terms & Conditions governing use of the Gravitas Edge Consulting website, accounts, Premium Opportunity Vaults, Free Preview, referral programme and other services.',
};

const WHATSAPP_URL = 'https://wa.me/message/5JALY3QF6BTKC1';
const CONTACT = 'gravitasedgeconsultant@gmail.com';

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout
      eyebrow="TERMS & CONDITIONS"
      title="Terms & Conditions"
      lastUpdated="12 September 2026"
      intro={
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
            {`These Terms & Conditions ("Terms") govern use of the Gravitas Edge Consulting website, accounts, Premium Opportunity Vaults, Free Preview, free channels, referral programme and other paid or free services unless separate terms expressly apply.`}
          </p>
          <p className="text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
            {`By creating an account, purchasing a subscription or using a paid service, you agree to these Terms. If you do not agree, do not purchase or use the relevant service.`}
          </p>
        </div>
      }
    >
      <PolicySection number="1." title="About Gravitas Edge">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted">
          {`Gravitas Edge operates two distinct service models:`}
        </p>
        <PolicySubheading>A. Premium Opportunity Vaults</PolicySubheading>
        <PolicyText>
          {`A subscription-based information and curation service through which employment opportunities and relevant application/contact routes are organised and made accessible to subscribers.`}
        </PolicyText>
        <PolicySubheading>B. Recruitment Consulting</PolicySubheading>
        <PolicyText>
          {`For specific client mandates, Gravitas Edge may be engaged to identify, approach, assess or coordinate with potentially suitable candidates.`}
        </PolicyText>
        <PolicyText>
          {`For opportunities appearing in the Premium Opportunity Vaults, Gravitas Edge is not the employer and is not the hiring agency unless a particular opportunity expressly states that Gravitas Edge is handling recruitment for that mandate. Hiring decisions remain solely with the relevant employer.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="2." title="Premium Opportunity Vaults">
        <PolicyList
          items={[
            'Early Career Access - India: generally up to 5 years of experience.',
            'Management Access - India: generally 5-10 years of experience.',
            'Leadership Access - India: senior management/leadership, generally 10+ years of experience.',
            'Executive Access - India: CXO and top executive-level opportunities in India.',
            'UAE & Global Access: opportunities outside India, primarily UAE, together with selected opportunities across other international markets.',
            'Remote Access - Global: remote opportunities across geographies, functions and experience levels.',
          ]}
        />
        <PolicyText>
          {`Vault scope, pricing, duration and positioning may be updated from time to time. The description displayed at the time of purchase governs the purchased subscription.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="3." title="What a Subscription Provides">
        <PolicyList
          items={[
            'Access to curated employment opportunities within the subscribed Vault.',
            'Relevant company, recruiter, Hiring Manager, consultant or application information according to the source and opportunity.',
            'A direct route to apply or make relevant employment-related contact for each opportunity posted.',
            'Access to new opportunities added to the subscribed Vault during the active subscription period.',
            'Access through the designated website/member area or other stated delivery method.',
          ]}
        />
        <PolicyText>
          {`The exact fields can vary by opportunity and source. Gravitas Edge does not promise that every listing will contain the same type of contact information.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="4." title="Free Preview and Free WhatsApp Channel">
        <PolicyText>
          {`The Free Preview contains selected sample opportunities intended to help users evaluate the nature and relevance of the service before subscribing. It is not a complete copy of any paid Vault.`}
        </PolicyText>
        <PolicyText>
          {`The free WhatsApp Channel may contain selected opportunity updates, announcements or other information. Free content may differ from paid Vault content and may be changed or discontinued.`}
        </PolicyText>
        <PolicyText>Viewing free content does not create a right to paid Vault access.</PolicyText>
      </PolicySection>

      <PolicySection number="5." title="Opportunity Availability and Third-Party Information">
        <PolicyList
          items={[
            'A vacancy may close at any time.',
            'An employer may change the role, requirements, location, compensation or hiring process.',
            'A recruiter, Hiring Manager or consultant may stop handling a vacancy or may not respond.',
            'An email address, application link or contact route may become inactive.',
            'The original source may remove or alter a listing.',
            'Information may change between curation and the subscriber viewing or using it.',
          ]}
        />
        <PolicyText>
          {`We make reasonable efforts to curate and present relevant information, but we do not guarantee that every opportunity remains open, unchanged or actionable at the time a subscriber views it.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="6." title="No Guarantee of Employment or Outcome">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted">
          {`Gravitas Edge does not guarantee:`}
        </p>
        <PolicyList
          items={[
            'Interview',
            'Shortlisting',
            'Recruiter or employer response',
            'Job offer or employment',
            'Salary or compensation level',
            'Visa, work permit or sponsorship',
            'Relocation support',
            'Any particular hiring outcome',
          ]}
        />
      </PolicySection>

      <PolicySection number="7." title="Responsible Use of Contact and Application Information">
        <PolicyList
          items={[
            'Users may use contact/application information only for genuine employment-related purposes connected with the relevant opportunity.',
            'No spam or bulk unsolicited communication.',
            'No harassment or repeated inappropriate contact.',
            'No unrelated commercial solicitation or marketing.',
            'No data harvesting, list building or resale.',
            'No publication of contact information outside the permitted service context.',
            'No unlawful or deceptive use.',
          ]}
        />
      </PolicySection>

      <PolicySection number="8." title="Account Security and Personal Use">
        <PolicyList
          items={[
            'Provide accurate account information.',
            'Keep credentials secure.',
            'Do not share a paid account or permit unauthorised access.',
            'Notify us of suspected unauthorised access.',
            'Use the subscription only for your own legitimate career/employment purposes unless expressly permitted otherwise.',
          ]}
        />
      </PolicySection>

      <PolicySection number="9." title="Prohibited Use">
        <PolicyList
          items={[
            'Republishing, reselling or redistributing Vault content.',
            'Systematically copying, downloading or reproducing the curated database.',
            'Scraping, crawling, automated extraction, bots or scripts used to extract content.',
            'Using the content to create or enhance a competing database/service.',
            'Circumventing access controls.',
            'Misusing recruiter/Hiring Manager/consultant details.',
            'Fraud, impersonation or false information.',
            'Any unlawful, abusive or harmful use.',
          ]}
        />
      </PolicySection>

      <PolicySection number="10." title="Intellectual Property and Third-Party Rights">
        <PolicyText>
          {`Underlying vacancies, employer materials and third-party information remain the property or responsibility of their respective owners/sources.`}
        </PolicyText>
        <PolicyText>
          {`To the extent permitted by law, Gravitas Edge retains rights in its branding, website, original materials and the selection, curation, organisation, categorisation, compilation and presentation of its Vault content.`}
        </PolicyText>
        <PolicyText>
          {`A subscription grants a limited, personal, non-transferable right to access the service during the paid period. It does not transfer ownership or redistribution rights.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="11." title="Pricing, Taxes and Payment">
        <PolicyText>
          {`The applicable price, subscription duration, taxes (if any), payment method and any promotional price will be displayed before payment.`}
        </PolicyText>
        <PolicyText>
          {`Promotional pricing may be time-limited and may differ from future pricing. A later price change does not ordinarily alter a subscription period already paid for.`}
        </PolicyText>
        <PolicyText>
          {`Payments may be processed by a third-party payment provider. Users must comply with the provider's applicable payment terms.`}
        </PolicyText>
        <PolicyText>
          {`A subscription is treated as successfully purchased only after successful payment confirmation. Pending, failed or reversed payments do not create an entitlement to access.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="12." title="Activation and Access">
        <PolicyText>
          {`Access may be activated automatically or manually after successful payment. If successful payment is confirmed but access is not provided within a reasonable period, contact support promptly.`}
        </PolicyText>
        <PolicyText>Access applies only to the Vault(s) and duration purchased.</PolicyText>
      </PolicySection>

      <PolicySection number="13." title="Renewal and Auto-Renewal">
        <PolicyText>
          {`If a plan does not auto-renew, access ends at expiry unless the user purchases a new subscription.`}
        </PolicyText>
        <PolicyText>
          {`If auto-renewal is offered, it must be clearly disclosed before purchase, including the recurring nature, renewal price or basis for determining it, billing frequency and cancellation mechanism. No auto-renewal should be inferred merely from a prior one-time purchase.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="14." title="Refunds and Cancellation">
        <PolicyText>
          {`Refunds and cancellation are governed by the Refund & Cancellation Policy. Because Vault access is a digital subscription and access may be provided shortly after payment, fees are generally non-refundable after access activation, subject to the exceptions and non-excludable rights stated in that Policy.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="15." title="Recruitment Consulting">
        <PolicyText>
          {`Where Gravitas Edge is handling a specific recruitment mandate, additional candidate/client communications or mandate-specific terms may apply.`}
        </PolicyText>
        <PolicyText>
          {`Candidate consideration, submission or communication in connection with Recruitment Consulting does not guarantee an interview, offer or employment. The employer/client retains final hiring authority.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="16." title="Referral Programme">
        <PolicyText>
          {`Referral rewards are governed by the separate Referral Programme Terms. Abuse, self-referral, duplicate/invalid accounts, fraudulent transactions, refunds or chargebacks may result in reward rejection or reversal.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="17." title="Suspension or Termination">
        <PolicyText>
          {`We may suspend or terminate access where we reasonably believe there has been a material Terms violation, account sharing, scraping, redistribution, misuse of contact information, fraud, unlawful activity, security risk, chargeback abuse, or where required by law.`}
        </PolicyText>
        <PolicyText>
          {`Where termination results from serious misuse, a refund may not be available, subject to applicable law.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="18." title="Third-Party Websites, Employers and Recruiters">
        <PolicyText>
          {`Third-party websites, employers, recruiters and consultants operate independently of Gravitas Edge. We are not responsible for their availability, policies, privacy practices, communications, hiring decisions or conduct.`}
        </PolicyText>
        <PolicyText>
          {`Users should independently assess an employer/recruiter and should never make improper payments or disclose sensitive financial credentials merely because an opportunity appears in a Vault.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="19." title="Limitation of Liability">
        <PolicyText>
          {`To the maximum extent permitted by applicable law, Gravitas Edge is not responsible for losses arising solely from employer/recruiter hiring decisions, non-response, closure or alteration of vacancies, outdated third-party information, third-party website failures, candidate-employer communications, visa decisions or employment outcomes.`}
        </PolicyText>
        <PolicyText>
          {`Nothing in these Terms excludes liability or consumer rights that cannot lawfully be excluded or limited.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="20." title="Indemnity for Misuse">
        <PolicyText>
          {`To the extent permitted by law, a user may be responsible for losses, claims or reasonable costs arising from their unlawful misuse of the service, unauthorised redistribution, scraping, infringement, fraud or misuse of third-party contact information.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="21." title="Governing Law and Disputes">
        <PolicyText>
          {`These Terms are governed by the laws of India, subject to mandatory consumer, privacy or other rights that may apply to a user under applicable law.`}
        </PolicyText>
        <PolicyText>
          {`Before initiating formal proceedings, users are encouraged to contact us so that a good-faith attempt can be made to resolve the issue. Nothing in this clause removes access to any forum or remedy that cannot legally be excluded.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="22." title="Changes to Terms">
        <PolicyText>
          {`We may update these Terms from time to time. The updated version will be published with a revised date. Material changes affecting existing users will be handled in accordance with applicable law and the nature of the change.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="23." title="Contact">
        <PolicyContactBlock
          rows={[
            { label: 'Business', value: 'Gravitas Edge Consulting' },
            { label: 'Email', value: CONTACT, href: `mailto:${CONTACT}` },
            { label: 'WhatsApp Support', value: WHATSAPP_URL, href: WHATSAPP_URL },
            {
              label: 'Business Address',
              value:
                'Flat No. 704, Mount Sea View Co-operative Housing Society Ltd., J.P. Road, Versova, Andheri (West), Mumbai 400061',
            },
          ]}
        />
      </PolicySection>
    </PolicyLayout>
  );
}
