import type { Metadata } from 'next';
import PolicyLayout, {
  PolicyList,
  PolicySection,
  PolicyText,
} from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Referral Programme Terms | Gravitas Edge',
  description:
    'Terms of the Gravitas Edge subscriber referral programme, including eligibility, reward rates, reward calculation and redemption options.',
};

const CONTACT = 'gravitasedgeconsultant@gmail.com';

export default function ReferralTermsPage() {
  return (
    <PolicyLayout
      eyebrow="REFERRAL PROGRAMME TERMS"
      title="Referral Programme Terms"
      lastUpdated="12 September 2026"
      intro={
        <p className="text-[15px] leading-relaxed">
          {`These Referral Programme Terms apply to the Gravitas Edge subscriber referral programme. Participation is optional and subject to these terms.`}
        </p>
      }
    >
      <PolicySection number="1." title="Eligibility">
        <PolicyText>
          {`The referral programme is available only to eligible Gravitas Edge subscribers/members for whom the referral feature is enabled. Gravitas Edge may require identity, account or payment verification before permitting cash withdrawal.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="2." title="Successful Referral">
        <PolicyText>
          {`A referral is successful when an eligible new referred person uses the applicable referral mechanism and completes an eligible paid Premium Opportunity Vault subscription that is successfully received and not cancelled, refunded, reversed, charged back, fraudulent or otherwise invalid.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="3." title="Reward Rates">
        <PolicyList
          items={[
            'Successful referrals 1 to 5: 10% reward on each eligible referred subscription.',
            'Successful referrals 6 to 10: 15% reward on each eligible referred subscription.',
            'Successful referral 11 onward: 20% reward on each eligible referred subscription, which is the maximum standard rate.',
          ]}
        />
        <PolicyText>
          {`The applicable percentage is determined by the referrer's successful referral count at the time the relevant referral qualifies. Percentages do not stack on a single subscription.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="4." title="Reward Calculation">
        <PolicyText>
          {`Rewards are calculated on the eligible subscription amount actually received for the referred transaction, excluding amounts that are refunded, reversed, charged back or otherwise not retained. Taxes, payment-gateway charges, discounts or other components may be excluded from the reward base where stated in the member area or required for proper accounting.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="5." title="Redemption Options">
        <PolicyText>
          {`Eligible available rewards may be offered as: (a) subscription credit against a future eligible Gravitas Edge purchase; or (b) cash withdrawal, subject to the minimum withdrawal threshold, verification, payment method, processing time and tax/accounting requirements displayed in the member area.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="6." title="Invalid Referrals">
        <PolicyList
          items={[
            'Self-referrals.',
            'Duplicate, fabricated or invalid accounts.',
            'Transactions intended primarily to manufacture referral rewards.',
            'Cancelled, refunded, reversed or charged-back transactions.',
            'Fraudulent, unauthorised or suspicious payments.',
            'Referrals generated through prohibited spam, misleading advertising or unlawful conduct.',
          ]}
        />
      </PolicySection>

      <PolicySection number="7." title="Reversal and Withholding">
        <PolicyText>
          {`Gravitas Edge may withhold, reverse or adjust rewards associated with an invalid transaction, refund, chargeback, fraud, error or programme abuse. If a reward has already been withdrawn, the amount may be set off against future rewards or otherwise recovered where legally permissible.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="8." title="Taxes">
        <PolicyText>
          {`Referral rewards may have tax consequences for the recipient. Participants are responsible for their own tax obligations. Gravitas Edge may deduct or report taxes where required by law and may request information reasonably necessary for such compliance.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="9." title="Promotion of Referral Links">
        <PolicyText>
          {`Participants must not make false or misleading claims about Gravitas Edge, guarantee jobs/interviews, impersonate Gravitas Edge, send unlawful spam, bid on protected branding in a misleading manner, or represent themselves as employees/agents unless authorised.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="10." title="No Employment or Agency Relationship">
        <PolicyText>
          {`Participation does not create employment, partnership, franchise, agency or authority to bind Gravitas Edge.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="11." title="Programme Changes or Closure">
        <PolicyText>
          {`Gravitas Edge may modify, suspend or discontinue the referral programme prospectively. Valid accrued rewards will be handled in accordance with the applicable programme terms and law. Material changes will be communicated where appropriate.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="12." title="Disputes and Contact">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
          {`Referral queries: `}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          {`. Include the registered account email and relevant referral/transaction information.`}
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
