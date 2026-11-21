import type { Metadata } from 'next';
import PolicyLayout, {
  PolicyList,
  PolicySection,
  PolicyText,
} from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Cookie Policy | Gravitas Edge',
  description:
    'Cookie Policy for Gravitas Edge Consulting explaining how cookies and similar technologies are used on its website.',
};

const CONTACT = 'gravitasedgeconsultant@gmail.com';

export default function CookiePolicyPage() {
  return (
    <PolicyLayout
      eyebrow="COOKIE POLICY"
      title="Cookie Policy"
      lastUpdated="12 September 2026"
      intro={
        <p className="text-[15px] leading-relaxed">
          {`Gravitas Edge Consulting may use cookies and similar technologies to operate, secure and improve its website.`}
        </p>
      }
    >
      <PolicySection number="1." title="What Cookies Are">
        <PolicyText>
          {`Cookies are small files or similar technologies stored on or accessed from a device when a website is used.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="2." title="Essential Technologies">
        <PolicyList
          items={[
            'Login and authentication.',
            'Account/session management.',
            'Security and fraud prevention.',
            'Remembering strictly necessary preferences.',
            'Payment/session continuity where required.',
            'Other functionality necessary to provide a service requested by the user.',
          ]}
        />
      </PolicySection>

      <PolicySection number="3." title="Analytics and Non-Essential Technologies">
        <PolicyText>
          {`Where analytics, advertising or other non-essential technologies are used, appropriate information and consent controls will be provided where required by applicable law.`}
        </PolicyText>
        <PolicyText>
          {`Non-essential technologies should not be activated before the required consent is obtained.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="4." title="Cookie Controls">
        <PolicyText>
          {`Where applicable, the website will provide options such as Accept All, Reject Non-Essential and Manage Preferences. Withdrawing or changing non-essential preferences should be reasonably accessible.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="5." title="Third-Party Technologies">
        <PolicyText>
          {`Third-party providers used for payments, analytics, embedded functionality, security or communications may use their own technologies and are governed by their own policies.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="6." title="Browser Controls">
        <PolicyText>
          {`Users may also manage cookies through browser/device settings. Blocking essential technologies may prevent some website functions from working correctly.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="7." title="Changes and Contact">
        <PolicyText>
          {`We may update this Cookie Policy when technologies, services or legal requirements change.`}
        </PolicyText>
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
          {`Questions: `}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
