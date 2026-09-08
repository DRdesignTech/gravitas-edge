const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MAGIC_BYTES: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  doc: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE2 compound document
  docx: [0x50, 0x4b, 0x03, 0x04], // ZIP (docx/xlsx)
};

export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts[parts.length - 1].toLowerCase();
}

export function hasValidExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(getExtension(filename));
}

export function sanitizeFilename(filename: string): string {
  const basename = filename.split('/').pop()?.split('\\').pop() || filename;
  return basename;
}

export function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  const expected = MAGIC_BYTES[extension];
  if (!expected) return false;
  if (buffer.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false;
  }
  return true;
}

export function isValidResumeFile(
  originalName: string,
  size: number,
  buffer: Buffer,
): {
  valid: boolean;
  error?: string;
} {
  const extension = getExtension(originalName);

  if (!hasValidExtension(originalName)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds maximum limit of 5MB` };
  }

  if (!validateMagicBytes(buffer, extension)) {
    return {
      valid: false,
      error: `Invalid file format. File extension '${extension}' does not match content`,
    };
  }

  return { valid: true };
}
