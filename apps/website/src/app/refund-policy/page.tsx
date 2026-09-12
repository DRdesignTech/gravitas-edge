import type { Metadata } from 'next';
import PolicyLayout, { PolicySection, PolicyText } from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Gravitas Edge',
  description:
    'Refund & Cancellation Policy for paid Premium Opportunity Vault subscriptions and other eligible digital purchases from Gravitas Edge Consulting.',
};

const CONTACT = 'gravitasedgeconsultant@gmail.com';

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      eyebrow="REFUND & CANCELLATION POLICY"
      title="Refund & Cancellation Policy"
      lastUpdated="12 September 2026"
      intro={
        <p className="text-[15px] leading-relaxed text-content-muted">
          {`This Policy applies to paid Premium Opportunity Vault subscriptions and other eligible digital purchases made directly from Gravitas Edge Consulting unless separate written terms apply.`}
        </p>
      }
    >
      <PolicySection number="1." title="Digital Subscription Access">
        <PolicyText>
          {`A Premium Opportunity Vault subscription provides digital access to curated employment opportunities and associated application/contact information for the purchased Vault and subscription period.`}
        </PolicyText>
        <PolicyText>Access may be activated shortly after successful payment.</PolicyText>
      </PolicySection>

      <PolicySection number="2." title="General Refund Position After Activation">
        <PolicyText>
          {`Once the purchased digital subscription has been activated and access to the relevant Vault has been provided, subscription fees are generally non-refundable.`}
        </PolicyText>
        <PolicyText>
          {`This reflects the immediate availability of digital subscription content. Nothing in this Policy excludes or limits a refund, cancellation right or other consumer remedy that cannot legally be excluded.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="3." title="Cases We Will Review">
        <PolicyText>{`We will review the following types of cases:`}</PolicyText>
        <ul className="mt-4 space-y-2.5">
          {[
            'Duplicate payment for the same intended purchase.',
            'Incorrect or unauthorised charge attributable to our payment flow, subject to verification.',
            'Technical payment failure resulting in an incorrect charge.',
            'Successful payment but failure by Gravitas Edge to provide the purchased access within a reasonable period after being notified.',
            'Material discrepancy between the service purchased and the service delivered.',
            'A refund or remedy required under applicable law.',
          ].map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-[15px] leading-relaxed text-content-muted"
            >
              <span
                className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500/70"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection number="4." title="Wrong Vault / Accidental Selection">
        <PolicyText>
          {`If you purchase the wrong Vault or subscription duration, contact us promptly and before materially using the purchased access where possible.`}
        </PolicyText>
        <PolicyText>
          {`We may, at our discretion, transfer or adjust access where technically and commercially feasible. This does not create an automatic right to refund or transfer, and mandatory legal rights remain unaffected.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="5." title="Promotional Pricing">
        <PolicyText>
          {`A later promotional offer, price reduction or different plan does not ordinarily entitle an existing subscriber to a retrospective refund of the difference.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="6." title="Cancellation and Expiry">
        <PolicyText>
          {`Cancelling a non-renewing subscription is not necessary; access expires at the end of the purchased period.`}
        </PolicyText>
        <PolicyText>
          {`Where auto-renewal is offered, cancelling auto-renewal stops future eligible renewal charges but ordinarily does not refund the current paid period. Access generally continues until the end of that period, subject to applicable law.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="7." title="Refund Processing">
        <PolicyText>
          {`Approved refunds will ordinarily be returned through the original payment method where feasible. Processing time may depend on the payment provider, bank or card network.`}
        </PolicyText>
        <PolicyText>
          {`We may request transaction information reasonably necessary to verify the payment.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="8." title="Chargebacks and Payment Disputes">
        <PolicyText>
          {`If you believe a charge is incorrect, please contact us first so that we can investigate. Fraudulent or abusive chargebacks may result in suspension of access and reversal of related referral rewards, subject to applicable law.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="9." title="How to Request Review">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
          {`Email: `}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
        <PolicyText>
          {`Please provide your account email, transaction/reference details, Vault purchased, payment date and reason for the request.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="10." title="Changes and Contact">
        <PolicyText>
          {`We may update this Policy from time to time. The current version will be published with a revised date.`}
        </PolicyText>
        <PolicyText>{`Business Address: [INSERT FINAL BUSINESS ADDRESS]`}</PolicyText>
      </PolicySection>
    </PolicyLayout>
  );
}
