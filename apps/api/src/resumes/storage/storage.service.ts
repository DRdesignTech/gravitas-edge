import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const STORAGE_LOCAL_PATH = process.env.STORAGE_LOCAL_PATH ?? './storage';
const STORAGE_LOCAL_PUBLIC_URL = process.env.STORAGE_LOCAL_PUBLIC_URL ?? 'http://localhost:5000';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    if (!fs.existsSync(STORAGE_LOCAL_PATH)) {
      fs.mkdirSync(STORAGE_LOCAL_PATH, { recursive: true });
    }
  }

  getFullPath(storagePath: string): string {
    return path.join(STORAGE_LOCAL_PATH, storagePath);
  }

  saveFile(
    buffer: Buffer,
    originalName: string,
    userId: string,
  ): { storageName: string; storagePath: string; publicUrl: string } {
    const extension = this.getExtension(originalName);
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const storageName = `${userId}-${uniqueSuffix}.${extension}`;
    const relativePath = `resumes/${userId}/${storageName}`;
    const fullPath = path.join(STORAGE_LOCAL_PATH, relativePath);

    fs.writeFileSync(fullPath, buffer);

    const storagePath = relativePath;
    const publicUrl = `${STORAGE_LOCAL_PUBLIC_URL}/${storagePath}`;

    this.logger.log(`Saved resume file: ${fullPath}`);
    return { storageName, storagePath, publicUrl };
  }

  getPublicUrl(storagePath: string): string {
    return `${STORAGE_LOCAL_PUBLIC_URL}/${storagePath}`;
  }

  deleteFile(storagePath: string): boolean {
    const fullPath = path.join(STORAGE_LOCAL_PATH, storagePath);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        this.logger.log(`Deleted resume file: ${fullPath}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete resume file: ${fullPath}`, error);
      return false;
    }
  }

  getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts[parts.length - 1].toLowerCase();
  }
}