import { describe, it, expect } from 'vitest';
import { createReference, setReferenceActive } from '../referenceData.service';
import { ForbiddenError } from '../../../common/errors/AppError';

describe('reference data guards', () => {
  it('createReference("statuses", ...) throws ForbiddenError', async () => {
    await expect(
      createReference('statuses', { code: 'X', nameEn: 'X', nameAr: 'X' }, 'actor-1'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('setReferenceActive("statuses", ...) throws ForbiddenError', async () => {
    await expect(setReferenceActive('statuses', 'some-id', false, 'actor-1')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
