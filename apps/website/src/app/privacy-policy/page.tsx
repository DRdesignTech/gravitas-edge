import type { Metadata } from 'next';
import PolicyLayout, {
  PolicyContactBlock,
  PolicyList,
  PolicySection,
  PolicyText,
} from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | Gravitas Edge',
  description:
    'Privacy Policy for Gravitas Edge Consulting, covering the website, user accounts, Premium Opportunity Vaults, resume uploads, Recruitment Consulting and related services.',
};

const WHATSAPP_URL = 'https://wa.me/message/5JALY3QF6BTKC1';
const CONTACT = 'gravitasedgeconsultant@gmail.com';

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      eyebrow="PRIVACY POLICY"
      title="Privacy Policy"
      lastUpdated="12 September 2026"
      intro={
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
            {`Gravitas Edge Consulting ("Gravitas Edge", "we", "us" or "our") respects your privacy and is committed to handling personal information responsibly. This Privacy Policy explains the personal information we may collect, why we use it, how it may be shared, how long it may be retained, and the rights and choices that may be available to you.`}
          </p>
          <p className="text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
            {`This Policy applies to the Gravitas Edge website, user accounts, Premium Opportunity Vaults, Free Preview, free communication channels, resume uploads, Recruitment Consulting interactions, referral programme, customer support and related services.`}
          </p>
        </div>
      }
    >
      <PolicySection number="1." title="Information We May Collect">
        <PolicyList
          items={[
            'Identity and contact information, such as name, email address and phone number.',
            'Account and login information.',
            'Subscription, transaction, invoice, refund and payment-status information.',
            'Vault selections, subscription duration and access information.',
            'Communications, enquiries, complaints and customer-support records.',
            'Referral programme information, including referral identifiers, successful referral status, reward calculations, credit/redemption and withdrawal records.',
            'Resume/CV information voluntarily uploaded by you, which may include employment history, qualifications, skills, location, professional profile details and other information you choose to include.',
            'Recruitment-related information you provide when interacting with us regarding a specific mandate.',
            'Website/device/security information reasonably required for operation, authentication, fraud prevention and security.',
            'Cookie, analytics or usage information where applicable and permitted.',
            'Records of consent, policy acceptance and communication preferences.',
            `Payment transactions may be processed by third-party payment providers. Gravitas Edge does not intend to store complete payment card credentials where those credentials are processed directly by the payment provider.`,
          ]}
        />
      </PolicySection>

      <PolicySection number="2." title="Purposes of Processing">
        <PolicyList
          items={[
            'Create, authenticate and administer user accounts.',
            'Process subscriptions, payments, refunds and access.',
            'Provide and maintain Premium Opportunity Vault access.',
            'Operate the Free Preview and free communication channels.',
            'Respond to enquiries, complaints and support requests.',
            'Administer referral rewards and prevent referral abuse or fraud.',
            'Process optional resume uploads and assess potential relevance to specific Recruitment Consulting mandates.',
            'Where appropriate, communicate with candidates about a potentially relevant recruitment mandate.',
            'Improve the relevance, usability, security and performance of our services.',
            'Maintain accounting, tax, audit, legal and business records.',
            'Prevent misuse, scraping, fraud, unauthorised access and other prohibited activity.',
            'Comply with applicable law, lawful requests and regulatory obligations.',
            'Send marketing communications where permitted and subject to applicable consent/opt-out requirements.',
          ]}
        />
      </PolicySection>

      <PolicySection number="3." title="Legal Basis / Permission for Use">
        <PolicyText>
          {`We process personal information only where there is an appropriate legal basis or permission under applicable law. Depending on the context, this may include your consent, processing necessary to provide a service you requested or purchased, compliance with legal obligations, or other lawful grounds recognised by applicable law.`}
        </PolicyText>
        <PolicyText>
          {`Where processing is based on consent, you may withdraw that consent through the mechanism provided or by contacting us. Withdrawal does not affect processing that was lawful before withdrawal and may not require deletion of information that must be retained for legal, accounting, fraud-prevention or other lawful purposes.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="4." title="Opportunity, Recruiter and Application Information">
        <PolicyText>
          {`Gravitas Edge curates employment opportunities from recruiters, Hiring Managers, employers, recruitment consultants, professional networks and other professional/recruitment sources available to us.`}
        </PolicyText>
        <PolicyText>
          {`The Premium Opportunity Vault service concerns the work involved in identifying, curating, organising, categorising and presenting opportunities together with the relevant route to apply or make contact. Gravitas Edge does not claim ownership of underlying third-party job vacancies or third-party contact information.`}
        </PolicyText>
        <PolicyText>
          {`Subscribers must use recruiter, Hiring Manager, consultant, employer and application information only for genuine employment-related purposes and in accordance with applicable law.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="5." title="Resume Uploads and Recruitment Consulting">
        <PolicyText>
          {`Resume upload is optional unless expressly stated otherwise for a particular service. Uploading a resume does not guarantee that Gravitas Edge will contact you, submit your profile, shortlist you, arrange an interview or secure employment.`}
        </PolicyText>
        <PolicyText>
          {`For specific Recruitment Consulting mandates where Gravitas Edge has been engaged to identify candidates, we may review candidate information and contact potentially relevant candidates. Where a profile is to be shared with a client/prospective employer, we will handle the sharing in accordance with the applicable recruitment process, our instructions/notice to the candidate and applicable law.`}
        </PolicyText>
        <PolicyText>
          Please avoid including unnecessary sensitive personal information in your resume.
        </PolicyText>
      </PolicySection>

      <PolicySection number="6." title="Sharing With Service Providers and Other Recipients">
        <PolicyList
          items={[
            'Website hosting, cloud infrastructure and database providers.',
            'Payment processors and payment gateways.',
            'Email, messaging, customer-support and communication providers.',
            'Authentication, security, fraud-prevention and technical service providers.',
            'Analytics providers where enabled and permitted.',
            'Professional advisers, auditors, accountants or legal advisers where reasonably necessary.',
            'Recruitment clients/prospective employers in connection with a relevant Recruitment Consulting mandate, in accordance with the applicable candidate process and law.',
            'Government, regulatory, judicial or law-enforcement authorities where disclosure is lawfully required.',
          ]}
        />
        <PolicyText>
          We do not sell your personal information as a standalone data product.
        </PolicyText>
      </PolicySection>

      <PolicySection number="7." title="International Processing and Transfers">
        <PolicyText>
          {`Gravitas Edge is operated from India. Some service providers or technologies may process or store personal information outside India or outside the country where a user is located.`}
        </PolicyText>
        <PolicyText>
          {`Where applicable, we will take reasonable steps to use appropriate safeguards and comply with applicable restrictions governing international processing or transfers.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="8." title="Retention">
        <PolicyText>
          {`We retain personal information only for as long as reasonably necessary for the purposes for which it was collected and for applicable legal, accounting, tax, security, fraud-prevention, dispute-resolution and contractual requirements.`}
        </PolicyText>
        <PolicyText>
          {`Resume/CV information may be retained for a reasonable period to support recruitment-related purposes unless you request deletion and no overriding lawful retention requirement applies. Retention periods may vary depending on the nature of the information and service.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="9." title="Security">
        <PolicyText>
          {`We use reasonable technical and organisational safeguards designed to protect personal information against unauthorised access, misuse, loss, alteration or disclosure. Access should be limited according to role and business need.`}
        </PolicyText>
        <PolicyText>No internet-based system can guarantee absolute security.</PolicyText>
      </PolicySection>

      <PolicySection number="10." title="Your Rights and Choices">
        <PolicyList
          items={[
            'Request information about personal information we process, where applicable.',
            'Request access to personal information, where applicable.',
            'Request correction or updating of inaccurate or incomplete information.',
            'Request deletion/erasure where legally applicable.',
            'Withdraw consent where processing is based on consent.',
            'Opt out of eligible marketing communications.',
            'Raise a grievance or complaint concerning our handling of personal information.',
            'Exercise any additional rights available under applicable data-protection law.',
          ]}
        />
        <PolicyText>
          {`We may need to verify your identity before acting on certain requests. Requests may be sent to ${CONTACT}.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="11." title="Children">
        <PolicyText>
          {`The paid services are intended for adults seeking employment or career opportunities. We do not knowingly provide Premium Opportunity Vault subscriptions to children. If we learn that personal information of a child has been collected in circumstances requiring deletion or parental consent, we will take appropriate action in accordance with applicable law.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="12." title="Marketing Communications">
        <PolicyText>
          {`Service communications necessary for account, payment, subscription, security or support purposes may be sent regardless of marketing preferences where permitted.`}
        </PolicyText>
        <PolicyText>
          {`Promotional communications will be handled in accordance with applicable law. Where an unsubscribe or opt-out mechanism is provided, we will honour valid requests.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="13." title="Third-Party Websites and Platforms">
        <PolicyText>
          {`Our services may contain links to employers, recruiters, consultants, professional networks, payment providers, WhatsApp or other third-party services. Their privacy and security practices are governed by their own policies. Gravitas Edge is not responsible for third-party privacy practices.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="14." title="Changes to this Policy">
        <PolicyText>
          {`We may update this Privacy Policy to reflect changes in law, technology or our services. The current version will be published with an updated date. Material changes may be communicated or require renewed consent where applicable.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="15." title="Contact / Grievance">
        <PolicyContactBlock
          rows={[
            { label: 'Business', value: 'Gravitas Edge Consulting' },
            { label: 'Email', value: CONTACT, href: `mailto:${CONTACT}` },
            { label: 'WhatsApp Support', value: WHATSAPP_URL, href: WHATSAPP_URL },
            {
              label: 'Business Address',
              value:
                '704, Mount Sea View Co-operative Housing Society Ltd., J.P. Road, Versova, Andheri (West), Mumbai 400061',
            },
            { label: 'Grievance Officer / Privacy Contact', value: '[INSERT IF REQUIRED]' },
          ]}
        />
      </PolicySection>
    </PolicyLayout>
  );
}
