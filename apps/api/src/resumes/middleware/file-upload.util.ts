import { BadRequestException } from '@nestjs/common';
import { FileFilterCallback } from 'multer';

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

export const fileUrlBuilder = (file: Express.Multer.File) => {
  return `/storage/${file.filename}`;
};
