import { describe, it, expect } from 'vitest';
import { toPublicAttachment } from '../ticketAttachments.service';
import { TicketAttachment } from '../ticketAttachment.entity';

describe('Ticket Attachments Service', () => {
  describe('toPublicAttachment', () => {
    it('should convert TicketAttachment to public format', () => {
      const attachment: TicketAttachment & { uploadedBy?: { id: string; fullNameEn: string; fullNameAr: string } | null } = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        originalName: 'document.pdf',
        storedName: '12345678-1234-1234-1234-123456789012.pdf',
        mimeType: 'application/pdf',
        sizeBytes: '102400',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        deletedAt: null,
        uploadedBy: { id: 'user123', fullNameEn: 'John Doe', fullNameAr: 'جون دو' },
      };

      const result = toPublicAttachment(attachment);

      expect(result).toEqual({
        id: attachment.id,
        ticketId: attachment.ticketId,
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: '102400',
        createdAt: attachment.createdAt,
        uploadedBy: { id: 'user123', fullNameEn: 'John Doe', fullNameAr: 'جون دو' },
      });
    });

    it('should NOT expose storedName in public format (internal detail)', () => {
      const attachment: TicketAttachment & { uploadedBy?: { id: string; fullNameEn: string; fullNameAr: string } | null } = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        originalName: 'sensitive.pdf',
        storedName: '12345678-1234-1234-1234-123456789012.pdf',
        mimeType: 'application/pdf',
        sizeBytes: '51200',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        deletedAt: null,
        uploadedBy: { id: 'user123', fullNameEn: 'Agent Smith', fullNameAr: 'عميل سميث' },
      };

      const result = toPublicAttachment(attachment);

      expect(result).not.toHaveProperty('storedName');
    });

    it('should handle null uploadedBy gracefully', () => {
      const attachment: TicketAttachment & { uploadedBy?: { id: string; fullNameEn: string; fullNameAr: string } | null } = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        originalName: 'orphan.pdf',
        storedName: 'uuid-uuid-uuid.pdf',
        mimeType: 'application/pdf',
        sizeBytes: '1024',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        deletedAt: null,
        uploadedBy: null,
      };

      const result = toPublicAttachment(attachment);

      expect(result.uploadedBy).toBeNull();
    });

    it('should preserve all required fields', () => {
      const attachment: TicketAttachment & { uploadedBy?: { id: string; fullNameEn: string; fullNameAr: string } | null } = {
        id: 'id-uuid',
        ticketId: 'ticket-uuid',
        originalName: 'file.pdf',
        storedName: 'stored.pdf',
        mimeType: 'application/pdf',
        sizeBytes: '1000',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        deletedAt: null,
        uploadedBy: { id: 'user-id', fullNameEn: 'User EN', fullNameAr: 'مستخدم' },
      };

      const result = toPublicAttachment(attachment);

      expect(result.id).toBe(attachment.id);
      expect(result.ticketId).toBe(attachment.ticketId);
      expect(result.originalName).toBe(attachment.originalName);
      expect(result.mimeType).toBe(attachment.mimeType);
      expect(result.sizeBytes).toBe(attachment.sizeBytes);
      expect(result.createdAt).toBe(attachment.createdAt);
      expect(result.uploadedBy).not.toBeNull();
    });
  });
});
