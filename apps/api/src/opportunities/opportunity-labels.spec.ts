import {
  OPPORTUNITY_FIELD_LABELS,
  OPPORTUNITY_FIELD_ORDER,
  buildApplyMailto,
  containsEmail,
  extractEmail,
} from '@job-portal/shared';

describe('opportunity field labels', () => {
  it('uses the exact spreadsheet labels in the required order', () => {
    expect(OPPORTUNITY_FIELD_ORDER.map((key) => OPPORTUNITY_FIELD_LABELS[key])).toEqual([
      'Job ID',
      'S. No.',
      'Date',
      'Role',
      'Sector',
      'Company',
      'Salary',
      'Location',
      'Experience',
      'Qualification',
      'Other Details',
      'How to apply',
    ]);
  });

  it('does not use the disallowed alternative labels', () => {
    const labels = Object.values(OPPORTUNITY_FIELD_LABELS);
    for (const forbidden of [
      'Job Title',
      'Industry',
      'Organization',
      'Pay Range',
      'Job Type',
      'Application Link',
    ]) {
      expect(labels).not.toContain(forbidden);
    }
  });
});

describe('apply-email extraction', () => {
  it('prefers the structured contact email over the legacy URL field', () => {
    expect(extractEmail('hr@acme.com', 'https://apply.acme.com')).toBe('hr@acme.com');
  });

  it('extracts an email embedded in How-to-apply free text', () => {
    expect(extractEmail(null, 'Mail your CV to careers@acme.test by Friday')).toBe(
      'careers@acme.test',
    );
  });

  it('returns null instead of inventing an address when none is present', () => {
    expect(extractEmail(null, undefined, 'https://apply.acme.com', 'Contact us')).toBeNull();
    expect(containsEmail('https://apply.acme.com')).toBe(false);
    expect(containsEmail('hr@acme.com')).toBe(true);
  });
});

describe('buildApplyMailto', () => {
  it('builds a mailto link (never a browser URL) with encoded subject and body', () => {
    const link = buildApplyMailto('hr@acme.com', {
      title: 'React Developer',
      company: 'Acme & Co',
    });
    expect(link.startsWith('mailto:hr@acme.com?')).toBe(true);
    expect(link).toContain('subject=Application%20for%20React%20Developer%20at%20Acme%20%26%20Co');
    expect(link).toContain('body=');
    expect(link).not.toMatch(/^https?:/);
  });
});
