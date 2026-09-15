import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function validatePassword(password: string) {
  const dto = new RegisterDto();
  dto.email = 'user@example.com';
  dto.password = password;
  return validate(dto);
}

describe('RegisterDto password policy', () => {
  it.each([
    ['StrongPass1!', 'typical strong password'],
    ['Pass1!wo', 'exactly 8 chars'],
    ['lowercase1!', 'lowercase-only accepted (no uppercase requirement)'],
    ['1234567890!a', 'letter appears late'],
    ['Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!', 'exactly 64 chars'],
  ])('accepts: %j', async (password: string) => {
    const errors = await validatePassword(password);
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });

  it.each([
    ['', 'empty'],
    ['Ab1!', 'too short'],
    ['Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!x', 'too long'],
    ['abcdefgh', 'no number or symbol'],
    ['abc12345', 'no symbol'],
    ['1234!567', 'no letter'],
    ['abcdeFg!', 'no number'],
    ['Pass-word1!', 'dash not in allowed charset'],
    ['Password1! ', 'space not in allowed charset'],
    ['Pässword1!', 'non-ASCII char not in allowed charset'],
  ])('rejects: %j', async (password: string) => {
    const errors = await validatePassword(password);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('returns the documented human-readable message', async () => {
    const errors = await validatePassword('abcdefgh');
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints?.matches).toEqual(
      'password must be 8-64 characters and include at least one letter, one number, and one symbol',
    );
  });
});
