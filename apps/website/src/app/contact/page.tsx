import type { Metadata } from 'next';
import PolicyLayout, {
  PolicyContactBlock,
  PolicyList,
  PolicySection,
  PolicyText,
} from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Contact Us, Complaints & Grievance Redressal | Gravitas Edge',
  description: 'Contact, complaints and grievance redressal details for Gravitas Edge Consulting.',
};

const WHATSAPP_URL = 'https://wa.me/message/5JALY3QF6BTKC1';
const CONTACT = 'enquiry@gravitasedgeconsulting.com';

export default function ContactPage() {
  return (
    <PolicyLayout
      eyebrow="CONTACT US"
      title="Contact Us, Complaints & Grievance Redressal"
      lastUpdated="12 September 2026"
      intro={
        <p className="text-[15px] leading-relaxed text-content-muted">
          {`We assist with account, subscription, payment, access, privacy, resume, referral and service-related queries.`}
        </p>
      }
    >
      <PolicySection number="1." title="Contact Details">
        <PolicyContactBlock
          rows={[
            { label: 'Business Name', value: 'Gravitas Edge Consulting' },
            { label: 'Email', value: CONTACT, href: `mailto:${CONTACT}` },
            { label: 'WhatsApp Support', value: WHATSAPP_URL, href: WHATSAPP_URL },
            { label: 'Business Address', value: '[INSERT FINAL BUSINESS ADDRESS]' },
            {
              label: 'Grievance Officer / Responsible Contact',
              value: '[INSERT NAME, DESIGNATION, EMAIL/PHONE IF REQUIRED]',
            },
          ]}
        />
      </PolicySection>

      <PolicySection number="2." title="How to Raise a Complaint">
        <PolicyText>
          {`Please send a written description of the issue together with your registered email address and, where relevant, transaction/reference details. Written communication helps us review the relevant account and transaction records.`}
        </PolicyText>
        <PolicyText>
          Where a matter genuinely requires a discussion, a callback may be arranged.
        </PolicyText>
      </PolicySection>

      <PolicySection number="3." title="Complaint Categories">
        <PolicyList
          items={[
            'Account creation or login.',
            'Subscription or Vault access.',
            'Payment, duplicate charge, refund or renewal.',
            'Incorrect Vault selection.',
            'Privacy/data request.',
            'Resume upload or Recruitment Consulting query.',
            'Referral reward or withdrawal issue.',
            'Website functionality or security concern.',
            'Other service complaint.',
          ]}
        />
      </PolicySection>

      <PolicySection number="4." title="Acknowledgement and Resolution">
        <PolicyText>
          {`We will acknowledge and review complaints within the period required by applicable law and will aim to resolve them as promptly as reasonably possible based on the nature and complexity of the issue.`}
        </PolicyText>
        <PolicyText>
          {`Where applicable law prescribes a specific acknowledgement or resolution timeline, that timeline will apply.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="5." title="Privacy and Data Requests">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
          {`For access, correction, deletion, consent withdrawal or other applicable privacy requests, email `}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          {`. We may request reasonable information to verify identity and locate the relevant account/data.`}
        </p>
      </PolicySection>

      <PolicySection number="6." title="Payment Disputes">
        <PolicyText>
          {`For payment issues, provide the transaction date, amount, payment reference and purchased Vault. Please do not send complete card numbers, CVV, OTPs or passwords.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="7." title="Escalation">
        <PolicyText>
          {`If you are dissatisfied with the initial response, reply to the same complaint thread requesting escalation to the designated responsible person. This does not restrict any statutory consumer or regulatory remedy available to you.`}
        </PolicyText>
      </PolicySection>
    </PolicyLayout>
  );
}
