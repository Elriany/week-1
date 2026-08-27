import fs from 'node:fs';
import path from 'node:path';
import type { Express } from 'express';
import { AppDataSource } from '../../config/data-source';
import { NotFoundError } from '../../common/errors/AppError';
import { CustomerAttachment } from './customerAttachment.entity';
import { ownerDir } from '../../common/uploads/attachments.upload';

export interface PublicAttachment {
  id: string;
  customerId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: Date;
  uploadedBy: { id: string; fullNameEn: string; fullNameAr: string } | null;
}

export function toPublicAttachment(a: CustomerAttachment & { uploadedBy?: { id: string; fullNameEn: string; fullNameAr: string } | null }): PublicAttachment {
  return {
    id: a.id,
    customerId: a.customerId,
    originalName: a.originalName,
    storedName: a.storedName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt,
    uploadedBy: a.uploadedBy ?? null,
  };
}

const attachments = () => AppDataSource.getRepository(CustomerAttachment);

export async function listAttachments(customerId: string): Promise<PublicAttachment[]> {
  const rows = await attachments()
    .createQueryBuilder('a')
    .leftJoinAndSelect('a.uploadedBy', 'uploader', 'uploader.id = a.uploadedByUserId')
    .select([
      'a.id',
      'a.customerId',
      'a.originalName',
      'a.storedName',
      'a.mimeType',
      'a.sizeBytes',
      'a.createdAt',
      'uploader.id',
      'uploader.fullNameEn',
      'uploader.fullNameAr',
    ])
    .where('a.customerId = :customerId', { customerId })
    .orderBy('a.createdAt', 'DESC')
    .getMany();

  return rows.map(r => toPublicAttachment(r as any));
}

export async function createAttachment(
  customerId: string,
  uploadedByUserId: string,
  file: Express.Multer.File,
): Promise<PublicAttachment> {
  const row = attachments().create({
    customerId,
    uploadedByUserId,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: String(file.size),
  });

  try {
    await attachments().save(row);
  } catch (err) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw err;
  }

  return toPublicAttachment({
    ...row,
    uploadedBy: { id: uploadedByUserId, fullNameEn: '', fullNameAr: '' },
  });
}

export async function findAttachmentById(id: string): Promise<CustomerAttachment> {
  const attachment = await attachments().findOne({ where: { id } });
  if (!attachment) throw new NotFoundError('Attachment');
  return attachment;
}

export async function softDeleteAttachment(id: string): Promise<void> {
  await findAttachmentById(id);
  await attachments().softDelete(id);
}
