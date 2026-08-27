import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { env } from '../../config/env';
import { AppError, ValidationError } from '../../common/errors/AppError';

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
]);

export function customerDir(customerId: string): string {
  const dir = path.resolve(UPLOAD_ROOT, customerId);
  if (dir !== UPLOAD_ROOT && !dir.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new ValidationError({ customerId: 'Invalid storage path' });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = customerDir(req.params.id);
    fs.mkdir(dir, { recursive: true }, err => cb(err, dir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20).replace(/[^A-Za-z0-9.]/g, '');
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const uploadAttachment = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError({ file: `Unsupported file type: ${file.mimetype}` }));
      return;
    }
    cb(null, true);
  },
}).single('file');

export const handleUpload: RequestHandler = (req, res, next) => {
  uploadAttachment(req, res, err => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'File exceeds the maximum upload size', 'PAYLOAD_TOO_LARGE'));
    }
    next(err);
  });
};
