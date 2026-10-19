import {
  canRevealCompanyExperience,
  companyExperienceLockMessage,
  companyInitial,
  isCompanyWithheld,
  isExperienceWithheld,
} from './opportunity-access';

const opportunity = {
  company: 'Acme Pvt Ltd',
  title: 'Senior Developer',
  experienceText: '3-5 years',
  minExperience: 3,
  maxExperience: 5,
  isPremium: true,
  isFullAccess: false,
  vaults: [{ id: 'vault-a' }],
};

describe('company and experience visibility rules', () => {
  it('hides both fields from anonymous visitors', () => {
    expect(canRevealCompanyExperience(opportunity, null)).toBe(false);
    expect(canRevealCompanyExperience(opportunity, undefined)).toBe(false);
  });

  it('hides both fields from signed-in users without a purchase', () => {
    expect(canRevealCompanyExperience(opportunity, false)).toBe(false);
  });

  it('reveals both fields to a purchaser whose vault covers the opportunity', () => {
    expect(canRevealCompanyExperience({ ...opportunity, isFullAccess: true }, true)).toBe(true);
  });

  it('keeps them hidden after the subscription expires', () => {
    expect(canRevealCompanyExperience({ ...opportunity, isFullAccess: false }, false)).toBe(false);
  });

  it('keeps them hidden when the purchase covers a different vault', () => {
    expect(canRevealCompanyExperience({ ...opportunity, isFullAccess: false }, true)).toBe(false);
  });

  it('fails closed when the API reports no access flag', () => {
    expect(canRevealCompanyExperience({ title: 'Role' }, true)).toBe(false);
    expect(canRevealCompanyExperience(null, true)).toBe(false);
  });

  it('never reveals hidden values as an avatar initial', () => {
    expect(companyInitial(opportunity, false)).toBe('S');
    expect(companyInitial(opportunity, false)).not.toBe('A');
    expect(companyInitial({ ...opportunity, isFullAccess: true }, true)).toBe('A');
    expect(companyInitial({}, false)).toBe('?');
  });

  it('only reports withheld state when there is a value to unlock', () => {
    expect(isCompanyWithheld(opportunity, false)).toBe(true);
    expect(isExperienceWithheld(opportunity, false)).toBe(true);
    expect(isCompanyWithheld({ ...opportunity, company: '   ' }, false)).toBe(false);
    expect(
      isExperienceWithheld(
        { ...opportunity, experienceText: null, minExperience: null, maxExperience: null },
        false,
      ),
    ).toBe(false);
    expect(isCompanyWithheld(opportunity, true)).toBe(false);
    expect(isExperienceWithheld(opportunity, true)).toBe(false);
  });

  it('explains what unlocks the fields', () => {
    expect(companyExperienceLockMessage(opportunity)).toBe(
      'Purchase this vault to unlock company and experience details',
    );
    expect(companyExperienceLockMessage({ ...opportunity, isPremium: false })).toBe(
      'Company and experience details are available with an active subscription',
    );
    expect(companyExperienceLockMessage(null)).toBe(
      'Company and experience details are available with an active subscription',
    );
  });
});
