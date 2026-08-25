import { describe, it, expect } from 'vitest'

describe('formatting utilities', () => {
  it('formats English dates with Intl.DateTimeFormat', () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory',
    })
    const date = new Date('2026-08-25')
    const result = formatter.format(date)

    expect(result).toMatch(/August.*25.*2026/)
  })

  it('formats Arabic dates with Gregorian calendar', () => {
    const formatter = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory',
    })
    const date = new Date('2026-08-25')
    const result = formatter.format(date)

    // Should return a valid formatted string
    expect(result).toBeTruthy()
    expect(result).not.toBe('')
  })

  it('formats numbers in English locale', () => {
    const formatter = new Intl.NumberFormat('en-US')
    const result = formatter.format(1234.56)

    expect(result).toMatch(/\d/)
  })

  it('formats numbers in Arabic locale', () => {
    const formatter = new Intl.NumberFormat('ar-SA')
    const result = formatter.format(1234.56)

    expect(result).toBeTruthy()
    expect(result).not.toBe('')
  })
})
