import type { Metadata } from 'next';
import PolicyLayout, {
  PolicyList,
  PolicySection,
  PolicyText,
} from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Disclaimer | Gravitas Edge',
  description:
    'Disclaimer for Gravitas Edge Consulting covering Premium Opportunity Vaults, Recruitment Consulting and related services.',
};

const CONTACT = 'gravitasedgeconsultant@gmail.com';

export default function DisclaimerPage() {
  return (
    <PolicyLayout
      eyebrow="DISCLAIMER"
      title="Disclaimer"
      lastUpdated="12 September 2026"
      intro={
        <p className="text-[15px] leading-relaxed">
          {`Gravitas Edge Consulting provides curated employment-opportunity information and, separately, may provide Recruitment Consulting for specific client mandates.`}
        </p>
      }
    >
      <PolicySection number="1." title="Premium Opportunity Vault Disclaimer">
        <PolicyText>
          {`Premium Opportunity Vault content is curated from recruiters, Hiring Managers, employers, recruitment consultants, professional networks and other professional/recruitment sources. Third-party information can change without notice.`}
        </PolicyText>
        <PolicyList
          items={[
            'A vacancy may close.',
            'Requirements, compensation or location may change.',
            'A recruiter/Hiring Manager/consultant may cease handling a vacancy or may not respond.',
            'An application email/link/contact route may stop working.',
            'The original source may remove or change information.',
            'Information may become outdated after curation.',
          ]}
        />
      </PolicySection>

      <PolicySection number="2." title="No Employment Guarantee">
        <PolicyText>
          {`Gravitas Edge does not guarantee an interview, shortlisting, response, offer, employment, compensation level, visa/work permit, sponsorship or any other hiring outcome.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="3." title="Not the Employer">
        <PolicyText>
          {`For Premium Opportunity Vault listings, Gravitas Edge is not the employer and does not act as the hiring agency unless expressly stated for a specific recruitment mandate. Applications are made to the relevant employer, recruiter, consultant or application channel.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="4." title="Free Preview">
        <PolicyText>
          {`The Free Preview is illustrative and contains selected opportunities only. It is intended to help users evaluate the service before deciding whether to subscribe. It is not a representation that every paid Vault will contain a particular number, category or frequency of opportunities.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="5." title="Recruitment Consulting">
        <PolicyText>
          {`Where Gravitas Edge is engaged for a specific recruitment mandate, candidate participation remains subject to the employer/client's requirements and decisions. No candidate is guaranteed submission, interview, offer or employment.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="6." title="Independent Verification and Safety">
        <PolicyText>
          {`Users should independently assess job suitability, employer/recruiter legitimacy and application requirements. Do not make payments to purported employers/recruiters, share passwords/OTP/card credentials, or provide unnecessary sensitive information merely because an opportunity was listed or shared.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="7." title="Third-Party Links">
        <PolicyText>
          {`Third-party sites and services are outside our control. Their content, security, availability and policies are their responsibility.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="8." title="Non-Excludable Rights">
        <PolicyText>
          {`Nothing in this Disclaimer limits rights or remedies that cannot legally be excluded.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="9." title="Contact">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
          {`Email: `}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
        <PolicyText>{`Business Address: 704, Mount Sea View Co-operative Housing Society Ltd., J.P. Road, Versova, Andheri (West), Mumbai 400061`}</PolicyText>
      </PolicySection>
    </PolicyLayout>
  );
}
