import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';

describe('StorageService path containment (security)', () => {
  let service: StorageService;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-portal-storage-'));
    process.env.STORAGE_LOCAL_PATH = tmpDir;
    service = new StorageService();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getFullPath', () => {
    it('resolves a normal relative resume path inside the storage root', () => {
      const full = service.getFullPath('resumes/user-1/abc.pdf');
      expect(full.startsWith(tmpDir)).toBe(true);
      expect(full).toContain('resumes');
      expect(full).toContain('user-1');
    });

    it('rejects absolute path traversal outside the storage root', () => {
      expect(() => service.getFullPath('../../etc/passwd')).toThrow(BadRequestException);
    });

    it('rejects traversal that escapes after resolution', () => {
      expect(() => service.getFullPath('resumes/../..//etc/shadow')).toThrow(BadRequestException);
    });

    it('rejects an absolute path argument', () => {
      expect(() => service.getFullPath('/etc/passwd')).toThrow(BadRequestException);
    });

    it('rejects empty / non-string inputs', () => {
      expect(() => service.getFullPath('')).toThrow(BadRequestException);
      expect(() => service.getFullPath(null as unknown as string)).toThrow(BadRequestException);
      expect(() => service.getFullPath(undefined as unknown as string)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteFile path containment', () => {
    it('rejects trailing traversal in deleteFile', () => {
      expect(() => service.deleteFile('resumes/../../outside.txt')).toThrow(BadRequestException);
    });
  });

  describe('saveFile', () => {
    it('writes only inside the storage root and returns a server-relative path', () => {
      const result = service.saveFile(Buffer.from('%PDF-1.4'), 'cv.pdf', 'user-9');
      expect(result.storagePath).toMatch(/^resumes\/user-9\/user-9-[a-f0-9]{32}\.pdf$/);
      expect(result.storagePath.includes('..')).toBe(false);
    });
  });
});
