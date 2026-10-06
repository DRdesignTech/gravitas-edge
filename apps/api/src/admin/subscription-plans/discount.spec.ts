import { calculateDiscountPercentage } from '@job-portal/shared';

/**
 * The admin plan form and this service both derive the discount from the two
 * prices using this helper, so these expectations are the contract that keeps
 * the admin badge and the website badge identical.
 */
describe('calculateDiscountPercentage', () => {
  it('matches the documented formula', () => {
    // ((2999 - 2499) / 2999) * 100 = 16.67 -> 17
    expect(calculateDiscountPercentage(2999, 2499)).toBe(17);
    expect(calculateDiscountPercentage(1999, 1499)).toBe(25);
    expect(calculateDiscountPercentage(5999, 4999)).toBe(17);
    expect(calculateDiscountPercentage(499, 299)).toBe(40);
    expect(calculateDiscountPercentage(799, 599)).toBe(25);
  });

  it('rounds to the nearest whole number', () => {
    // 16.5 rounds up to 17, 16.4 rounds down to 16
    expect(calculateDiscountPercentage(10000, 8350)).toBe(17);
    expect(calculateDiscountPercentage(10000, 8360)).toBe(16);
  });

  it('returns 0 when the current price is at or above the regular price', () => {
    expect(calculateDiscountPercentage(1499, 1499)).toBe(0);
    expect(calculateDiscountPercentage(1499, 1499.01)).toBe(0);
    expect(calculateDiscountPercentage(100, 250)).toBe(0);
  });

  it('never returns a negative discount', () => {
    expect(calculateDiscountPercentage(100, 500)).toBe(0);
    expect(calculateDiscountPercentage(100, Number.NaN)).toBe(0);
  });

  it('treats a negative current price as invalid rather than a bargain', () => {
    // The API rejects negative prices outright; the admin form calls this while
    // a price field is still mid-typing, so "-" must not read as 100% off.
    expect(calculateDiscountPercentage(100, -50)).toBe(0);
    expect(calculateDiscountPercentage(1000, -1000)).toBe(0);
  });

  it('never returns more than 100', () => {
    expect(calculateDiscountPercentage(1000, 0)).toBe(100);
  });

  it('handles empty and invalid input safely', () => {
    expect(calculateDiscountPercentage('', '')).toBe(0);
    expect(calculateDiscountPercentage('   ', '100')).toBe(0);
    expect(calculateDiscountPercentage('100', '')).toBe(0);
    expect(calculateDiscountPercentage(null, undefined)).toBe(0);
    expect(calculateDiscountPercentage(undefined, 100)).toBe(0);
    expect(calculateDiscountPercentage('abc', 'def')).toBe(0);
    expect(calculateDiscountPercentage(Infinity, 10)).toBe(0);
  });

  it('does not treat a blank input as a price of zero', () => {
    // Number('') is 0, so a naive parse would report a bogus 100% off here.
    expect(calculateDiscountPercentage('2999', '')).toBe(0);
  });

  it('guards against division by zero', () => {
    expect(calculateDiscountPercentage(0, 0)).toBe(0);
    expect(calculateDiscountPercentage(0, 100)).toBe(0);
    expect(calculateDiscountPercentage(-100, 0)).toBe(0);
  });

  it('accepts the raw strings an admin form produces', () => {
    expect(calculateDiscountPercentage('2999', '2499')).toBe(17);
    expect(calculateDiscountPercentage(' 2999 ', ' 2499 ')).toBe(17);
    expect(calculateDiscountPercentage('1999', '1499.5')).toBe(25);
  });
});
