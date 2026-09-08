import { getCorsOrigins, corsOriginCallback } from './cors.util';

describe('CORS configuration (security)', () => {
  it('allows localhost dev origins by default', () => {
    const origins = getCorsOrigins(undefined);
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://localhost:3001');
  });

  it('parses and trims comma-separated origins from env', () => {
    const origins = getCorsOrigins('https://a.com, https://b.com , ');
    expect(origins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('never allows a non-allow-listed browser origin', () => {
    const cb = corsOriginCallback(['http://localhost:3000']);
    const denied = cb('https://evil.example', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(false);
    });
    void denied;
    const allowed = cb('http://localhost:3000', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });
    void allowed;
  });

  it('rejects wildcard-style origins unless explicitly listed', () => {
    const cb = corsOriginCallback(['http://localhost:3000']);
    cb('*', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(false);
    });
    cb('http://localhost.evil.com', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(false);
    });
  });
});
