import { describe, it, expect } from 'vitest'
import en from '../locales/en.json'
import ar from '../locales/ar.json'

function flattenKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

describe('i18n locale parity', () => {
  it('en.json and ar.json have identical key structures', () => {
    const enKeys = flattenKeys(en)
    const arKeys = flattenKeys(ar)

    const enSet = new Set(enKeys)
    const arSet = new Set(arKeys)

    const missingInAr = enKeys.filter(k => !arSet.has(k))
    const extraInAr = arKeys.filter(k => !enSet.has(k))

    expect(missingInAr, 'Missing keys in ar.json').toHaveLength(0)
    expect(extraInAr, 'Extra keys in ar.json').toHaveLength(0)
    expect(enKeys).toEqual(arKeys)
  })

  it('no Arabic value is empty', () => {
    function checkNonEmpty(obj: any): string[] {
      const emptyKeys: string[] = []
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          emptyKeys.push(...checkNonEmpty(value))
        } else if (typeof value === 'string' && value.trim() === '') {
          emptyKeys.push(key)
        }
      }
      return emptyKeys
    }

    const emptyKeys = checkNonEmpty(ar)
    expect(emptyKeys, 'Found empty Arabic values').toHaveLength(0)
  })
})
