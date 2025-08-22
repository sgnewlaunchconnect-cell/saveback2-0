import { describe, it, expect } from 'vitest'
import { parsePaymentCode, isValidPaymentCode, formatPaymentCode } from '../qrParsing'

describe('parsePaymentCode', () => {
  it('parses direct 6-digit codes', () => {
    expect(parsePaymentCode('123456')).toBe('123456')
    expect(parsePaymentCode('000000')).toBe('000000')
    expect(parsePaymentCode('999999')).toBe('999999')
  })

  it('extracts codes from URLs', () => {
    expect(parsePaymentCode('https://app.com/pay/123456')).toBe('123456')
    expect(parsePaymentCode('https://example.com/payment/456789')).toBe('456789')
    expect(parsePaymentCode('http://localhost:3000/pay/111111')).toBe('111111')
  })

  it('extracts codes from query parameters', () => {
    expect(parsePaymentCode('https://app.com/pay?code=123456')).toBe('123456')
    expect(parsePaymentCode('https://app.com/pay?payment=456789')).toBe('456789')
    expect(parsePaymentCode('https://app.com/pay?paymentCode=111111')).toBe('111111')
    expect(parsePaymentCode('https://app.com/pay?foo=bar&code=222222&baz=qux')).toBe('222222')
  })

  it('extracts codes from text patterns', () => {
    expect(parsePaymentCode('Payment Code: 123456')).toBe('123456')
    expect(parsePaymentCode('CODE: 456789')).toBe('456789')
    expect(parsePaymentCode('Pay: 111111')).toBe('111111')
    expect(parsePaymentCode('#222222')).toBe('222222')
    expect(parsePaymentCode('Your payment code is 333333')).toBe('333333')
  })

  it('handles invalid inputs', () => {
    expect(parsePaymentCode('')).toBe(null)
    expect(parsePaymentCode('   ')).toBe(null)
    expect(parsePaymentCode('12345')).toBe(null) // too short
    expect(parsePaymentCode('1234567')).toBe(null) // too long
    expect(parsePaymentCode('abcdef')).toBe(null) // not digits
    expect(parsePaymentCode('https://app.com/pay/')).toBe(null) // no code
    expect(parsePaymentCode(null as any)).toBe(null)
    expect(parsePaymentCode(undefined as any)).toBe(null)
  })

  it('finds first valid code in complex text', () => {
    expect(parsePaymentCode('Invalid: 12345, Valid: 123456, Another: 789012')).toBe('123456')
    expect(parsePaymentCode('Text with 123456 and also 789012')).toBe('123456')
  })
})

describe('isValidPaymentCode', () => {
  it('validates 6-digit codes', () => {
    expect(isValidPaymentCode('123456')).toBe(true)
    expect(isValidPaymentCode('000000')).toBe(true)
    expect(isValidPaymentCode('999999')).toBe(true)
  })

  it('rejects invalid codes', () => {
    expect(isValidPaymentCode('12345')).toBe(false)
    expect(isValidPaymentCode('1234567')).toBe(false)
    expect(isValidPaymentCode('abcdef')).toBe(false)
    expect(isValidPaymentCode('')).toBe(false)
    expect(isValidPaymentCode('123 456')).toBe(false)
  })
})

describe('formatPaymentCode', () => {
  it('formats valid codes', () => {
    expect(formatPaymentCode('123456')).toBe('123 456')
    expect(formatPaymentCode('000000')).toBe('000 000')
  })

  it('returns invalid codes unchanged', () => {
    expect(formatPaymentCode('12345')).toBe('12345')
    expect(formatPaymentCode('abcdef')).toBe('abcdef')
    expect(formatPaymentCode('')).toBe('')
  })
})