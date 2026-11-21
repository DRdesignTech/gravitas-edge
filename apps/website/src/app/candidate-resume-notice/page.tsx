import type { Metadata } from 'next';
import PolicyLayout, {
  PolicyList,
  PolicySection,
  PolicyText,
} from '@/components/legal/PolicyLayout';

export const metadata: Metadata = {
  title: 'Candidate Resume & Recruitment Consulting Notice | Gravitas Edge',
  description:
    'Notice explaining how optional resume uploads and candidate information may be used in connection with Gravitas Edge Recruitment Consulting.',
};

const CONTACT = 'gravitasedgeconsultant@gmail.com';

export default function CandidateResumeNoticePage() {
  return (
    <PolicyLayout
      eyebrow="CANDIDATE NOTICE"
      title="Candidate Resume & Recruitment Consulting Notice"
      lastUpdated="12 September 2026"
      intro={
        <p className="text-[15px] leading-relaxed">
          {`This Notice explains how optional resume uploads and candidate information may be used in connection with Gravitas Edge Recruitment Consulting and related candidate services.`}
        </p>
      }
    >
      <PolicySection number="1." title="Resume Upload Is Optional">
        <PolicyText>
          {`You do not need to upload a resume merely to view the Free Preview. Unless expressly stated for a particular service, resume upload is not a condition of purchasing a Premium Opportunity Vault.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="2." title="Why We May Use Your Resume">
        <PolicyList
          items={[
            'Maintain a candidate profile associated with your account.',
            'Review your background for potential relevance to a specific recruitment mandate handled by Gravitas Edge.',
            'Contact you where we believe a mandate may be relevant.',
            'Support future improvements intended to make opportunity relevance more useful to members, where implemented lawfully.',
          ]}
        />
      </PolicySection>

      <PolicySection number="3." title="What Your Resume May Contain">
        <PolicyText>
          {`A resume may contain name, contact details, employment history, qualifications, skills, professional achievements, location and other information you choose to provide. Please do not include unnecessary sensitive information such as passwords, financial credentials, government identification numbers or unrelated medical information.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="4." title="Sharing With Recruitment Clients">
        <PolicyText>
          {`For a specific Recruitment Consulting mandate, candidate information may be shared with the relevant client/prospective employer as part of the recruitment process in accordance with the applicable candidate communication, instructions and law.`}
        </PolicyText>
        <PolicyText>
          {`Where a mandate requires additional consent or information, we may contact you before proceeding.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="5." title="No Guarantee">
        <PolicyText>
          {`Uploading a resume or being contacted by Gravitas Edge does not guarantee profile submission, shortlisting, interview, offer or employment.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="6." title="Candidate Accuracy">
        <PolicyText>
          {`You are responsible for ensuring that information you provide is accurate and that you have the right to provide it. Do not misrepresent qualifications, experience or identity.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="7." title="Retention and Deletion">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
          {`Candidate information may be retained for a reasonable recruitment/business period and applicable legal requirements. You may request deletion where legally applicable by emailing `}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          {`.`}
        </p>
      </PolicySection>

      <PolicySection number="8." title="Privacy Policy">
        <PolicyText>
          {`The Gravitas Edge Privacy Policy applies to candidate information and should be read together with this Notice.`}
        </PolicyText>
      </PolicySection>

      <PolicySection number="9." title="Contact">
        <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:dark:text-brand-400">
          {`Email: `}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
