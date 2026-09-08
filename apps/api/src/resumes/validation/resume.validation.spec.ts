import {
  isValidResumeFile,
  getExtension,
  hasValidExtension,
  validateMagicBytes,
} from './resume.validation';

describe('Resume file validation (security)', () => {
  describe('hasValidExtension', () => {
    it('accepts pdf, doc, docx', () => {
      expect(hasValidExtension('resume.pdf')).toBe(true);
      expect(hasValidExtension('cv.doc')).toBe(true);
      expect(hasValidExtension('cv.docx')).toBe(true);
    });

    it('rejects anything else', () => {
      expect(hasValidExtension('virus.exe')).toBe(false);
      expect(hasValidExtension('script.js')).toBe(false);
      expect(hasValidExtension('page.html')).toBe(false);
      expect(hasValidExtension('img.png')).toBe(false);
      expect(hasValidExtension('noext')).toBe(false);
      expect(hasValidExtension('resume.pdf.exe')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(hasValidExtension('RESUME.PDF')).toBe(true);
      expect(hasValidExtension('Resume.DocX')).toBe(true);
    });
  });

  describe('getExtension', () => {
    it('returns lowercased last extension', () => {
      expect(getExtension('cv.PDF')).toBe('pdf');
      expect(getExtension('a.b.docx')).toBe('docx');
    });
  });

  describe('validateMagicBytes', () => {
    it('accepts a PDF header', () => {
      expect(validateMagicBytes(Buffer.from('%PDF-1.4 ...'), 'pdf')).toBe(true);
    });

    it('rejects non-PDF content for pdf extension', () => {
      expect(validateMagicBytes(Buffer.from('<html></html>'), 'pdf')).toBe(false);
    });

    it('accepts a real OLE2 (doc) header', () => {
      const ole2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
      expect(validateMagicBytes(ole2, 'doc')).toBe(true);
    });

    it('rejects a non-OLE2 header for doc extension', () => {
      const notOle2 = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
      expect(validateMagicBytes(notOle2, 'doc')).toBe(false);
    });

    it('accepts a ZIP/OfficeOpenXML (docx) header', () => {
      expect(validateMagicBytes(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]), 'docx')).toBe(
        true,
      );
    });

    it('rejects a PDF header for a docx extension', () => {
      expect(validateMagicBytes(Buffer.from('%PDF-1.4'), 'docx')).toBe(false);
    });
  });

  describe('isValidResumeFile', () => {
    const MAX = 5 * 1024 * 1024;

    it('accepts a valid small PDF', () => {
      const buf = Buffer.from('%PDF-1.4 content approx'.repeat(2048));
      const res = isValidResumeFile('cv.pdf', buf.length, buf);
      expect(res.valid).toBe(true);
    });

    it('rejects an invalid extension even with valid magic bytes', () => {
      const buf = Buffer.from('%PDF-1.4');
      const res = isValidResumeFile('virus.exe', buf.length, buf);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid file extension');
    });

    it('rejects an oversized file', () => {
      const buf = Buffer.from('%PDF-1.4');
      const res = isValidResumeFile('cv.pdf', MAX + 1, buf);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('5MB');
    });

    it('rejects a file whose content does not match the extension', () => {
      const buf = Buffer.from('<html><script>alert(1)</script></html>');
      const res = isValidResumeFile('cv.pdf', buf.length, buf);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('does not match content');
    });

    it('rejects an empty buffer', () => {
      const res = isValidResumeFile('cv.pdf', 0, Buffer.alloc(0));
      expect(res.valid).toBe(false);
    });
  });
});
