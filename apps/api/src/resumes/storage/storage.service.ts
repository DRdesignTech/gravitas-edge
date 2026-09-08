import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageLocalPath: string;
  private readonly storageLocalPublicUrl: string;

  constructor() {
    this.storageLocalPath = path.resolve(process.env.STORAGE_LOCAL_PATH ?? './storage');
    this.storageLocalPublicUrl = process.env.STORAGE_LOCAL_PUBLIC_URL ?? '';

    if (!fs.existsSync(this.storageLocalPath)) {
      fs.mkdirSync(this.storageLocalPath, { recursive: true });
    }
  }

  /**
   * Resolve a stored relative path safely, guaranteeing the result stays
   * inside the storage root. Throws on path traversal attempts.
   */
  private resolveSafe(storagePath: string): string {
    if (!storagePath || typeof storagePath !== 'string') {
      throw new BadRequestException('Invalid file path');
    }
    const resolved = path.resolve(this.storageLocalPath, storagePath);
    if (
      resolved !== this.storageLocalPath &&
      !resolved.startsWith(this.storageLocalPath + path.sep)
    ) {
      throw new BadRequestException('Invalid file path');
    }
    return resolved;
  }

  getFullPath(storagePath: string): string {
    return this.resolveSafe(storagePath);
  }

  saveFile(
    buffer: Buffer,
    originalName: string,
    userId: string,
  ): { storageName: string; storagePath: string; publicUrl?: string } {
    const extension = this.getExtension(originalName);
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const storageName = `${userId}-${uniqueSuffix}.${extension}`;
    const relativePath = `resumes/${userId}/${storageName}`;
    const fullPath = this.resolveSafe(relativePath);

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, buffer);

    const storagePath = relativePath;
    const publicUrl = this.storageLocalPublicUrl
      ? `${this.storageLocalPublicUrl}/${storagePath}`
      : undefined;

    this.logger.log(`Saved resume file: ${fullPath}`);
    return { storageName, storagePath, publicUrl };
  }

  getPublicUrl(storagePath: string): string {
    if (!this.storageLocalPublicUrl) return '';
    this.resolveSafe(storagePath);
    return `${this.storageLocalPublicUrl}/${storagePath}`;
  }

  deleteFile(storagePath: string): boolean {
    const fullPath = this.resolveSafe(storagePath);
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
