/**
 * Versioned logo path so browsers fetch the updated asset after the PNG is
 * replaced in place at /public/brand/logo.png. Bump the version whenever the
 * logo file is updated to bust any cached copy.
 */
export const BRAND_LOGO_SRC = '/brand/logo.png?v=3';