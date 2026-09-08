import { Injectable, NestMiddleware, UnprocessableEntityException } from '@nestjs/common';
import { Request, NextFunction } from 'express';
import * as path from 'path';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts[parts.length - 1].toLowerCase();
}

function hasValidExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(getExtension(filename));
}

function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename);
  if (basename !== filename) {
    return basename;
  }
  return filename;
}

@Injectable()
export class FileValidationMiddleware implements NestMiddleware<Request> {
  use(req: Request, next: NextFunction) {
    const file = (req as any).file;

    if (!file) {
      return next();
    }

    const { originalname, size } = file;

    // 1. Check extension
    if (!hasValidExtension(originalname)) {
      return next(
        new UnprocessableEntityException(
          `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        ),
      );
    }

    // 2. Check file size
    if (size > MAX_FILE_SIZE) {
      return next(new UnprocessableEntityException(`File size exceeds maximum limit of 5MB`));
    }

    // 3. Sanitize filename to prevent path traversal
    file.sanitizedName = sanitizeFilename(originalname);

    next();
  }
}
