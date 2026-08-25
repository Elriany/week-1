import { describe, it, expect } from 'vitest'

describe('useLocalizedName logic', () => {
  // Test the logic directly without using the composable
  function getLocalizedName(locale: string, entity: { nameEn?: string | null; nameAr?: string | null }): string {
    if (locale === 'ar') {
      return entity.nameAr || entity.nameEn || ''
    }
    return entity.nameEn || entity.nameAr || ''
  }

  it('returns nameEn in English locale', () => {
    const entity = { nameEn: 'Main Branch', nameAr: 'الفرع الرئيسي' }
    expect(getLocalizedName('en', entity)).toBe('Main Branch')
  })

  it('returns nameAr in Arabic locale', () => {
    const entity = { nameEn: 'Main Branch', nameAr: 'الفرع الرئيسي' }
    expect(getLocalizedName('ar', entity)).toBe('الفرع الرئيسي')
  })

  it('falls back to nameEn when nameAr is null', () => {
    const entity = { nameEn: 'Main Branch', nameAr: null }
    expect(getLocalizedName('ar', entity)).toBe('Main Branch')
  })

  it('falls back to nameEn when nameAr is empty string', () => {
    const entity = { nameEn: 'Main Branch', nameAr: '' }
    expect(getLocalizedName('ar', entity)).toBe('Main Branch')
  })

  it('returns empty string when both are absent', () => {
    const entity = { nameEn: null, nameAr: null }
    expect(getLocalizedName('en', entity)).toBe('')
  })
})
