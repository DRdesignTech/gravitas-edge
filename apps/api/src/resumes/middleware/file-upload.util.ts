import { BadRequestException } from '@nestjs/common';
import { FileFilterCallback } from 'multer';

const RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];

export const fileFilter = (allowedExtensions: string[]) => {
  return (file: Express.Multer.File, callback: FileFilterCallback) => {
    const ext = file.originalname?.split('.').pop()?.toLowerCase();

    if (!ext || !allowedExtensions.includes(ext)) {
      return callback(
        new (BadRequestException as any)(
          `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`,
        ),
        false,
      );
    }

    callback(null, true);
  };
};

export const resumeFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ext = file.originalname?.split('.').pop()?.toLowerCase();

  if (!ext || !RESUME_EXTENSIONS.includes(ext)) {
    return callback(
      new BadRequestException(`Invalid file type. Allowed: ${RESUME_EXTENSIONS.join(', ')}`),
      false,
    );
  }

  callback(null, true);
};

export const fileUrlBuilder = (file: Express.Multer.File) => {
  return `/storage/${file.filename}`;
};
