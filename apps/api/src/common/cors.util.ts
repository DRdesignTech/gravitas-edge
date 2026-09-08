/** Build the allow-listed CORS origins from the CORS_ORIGINS env var. */
export function getCorsOrigins(env = process.env.CORS_ORIGINS): string[] {
  return (env ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * CORS origin decision callback. Browser requests without an Origin header or
 * from a non-allow-listed origin are rejected; requests with no Origin header
 * (curl, server-to-server, non-browser clients) are allowed because
 * authentication is bearer-token based and never cookie-based, so there is no
 * CSRF surface exposed via CORS.
 */
export function corsOriginCallback(allowed: string[]) {
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    callback(null, allowed.includes(origin));
  };
}
