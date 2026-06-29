/**
 * CSV Export Tests
 * 
 * Tests for CSV escaping, formula injection neutralization, and export functionality
 * following RFC 4180 and OWASP security guidelines.
 */

import { describe, expect, it } from 'vitest'
import { escapeCsvField, generateLedgerCsv } from './csvExport'
import type { WalletLedgerEntry } from './walletApi'

describe('escapeCsvField', () => {
  describe('formula injection neutralization', () => {
    it('neutralizes cells starting with =', () => {
      expect(escapeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    })

    it('neutralizes cells starting with +', () => {
      expect(escapeCsvField('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)")
    })

    it('neutralizes cells starting with -', () => {
      expect(escapeCsvField('-123')).toBe("'-123")
    })

    it('neutralizes cells starting with @', () => {
      expect(escapeCsvField('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)")
    })

    it('neutralizes cells starting with tab', () => {
      expect(escapeCsvField('\tSUM(A1:A10)')).toBe("'\tSUM(A1:A10)")
    })

    it('neutralizes cells starting with carriage return', () => {
      expect(escapeCsvField('\rSUM(A1:A10)')).toBe("'\rSUM(A1:A10)")
    })

    it('does not neutralize safe text', () => {
      expect(escapeCsvField('normal text')).toBe('normal text')
    })

    it('does not neutralize text starting with safe characters', () => {
      expect(escapeCsvField('A1')).toBe('A1')
      expect(escapeCsvField('1')).toBe('1')
      expect(escapeCsvField('$100')).toBe('$100')
    })

    it('handles empty strings', () => {
      expect(escapeCsvField('')).toBe('')
    })
  })

  describe('RFC 4180 escaping', () => {
    it('escapes fields containing commas', () => {
      expect(escapeCsvField('Smith, John')).toBe('"Smith, John"')
    })

    it('escapes fields containing newlines', () => {
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
    })

    it('escapes fields containing carriage returns', () => {
      expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"')
    })

    it('escapes fields containing double quotes by doubling them', () => {
      expect(escapeCsvField('He said "hello"')).toBe('"He said ""hello"""')
    })

    it('escapes fields with mixed special characters', () => {
      expect(escapeCsvField('Smith, "John"\nDoe')).toBe('"Smith, ""John""\nDoe"')
    })

    it('does not escape simple text without special characters', () => {
      expect(escapeCsvField('John Smith')).toBe('John Smith')
    })

    it('handles numbers', () => {
      expect(escapeCsvField(123)).toBe('123')
      expect(escapeCsvField(123.45)).toBe('123.45')
    })

    it('handles booleans', () => {
      expect(escapeCsvField(true)).toBe('true')
      expect(escapeCsvField(false)).toBe('false')
    })
  })

  describe('null/undefined handling', () => {
    it('returns empty string for null', () => {
      expect(escapeCsvField(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(escapeCsvField(undefined)).toBe('')
    })
  })

  describe('unicode handling', () => {
    it('handles unicode characters', () => {
      expect(escapeCsvField('日本語')).toBe('日本語')
      expect(escapeCsvField('Ñoño')).toBe('Ñoño')
      expect(escapeCsvField('café')).toBe('café')
    })

    it('handles unicode with special characters', () => {
      expect(escapeCsvField('café, Paris')).toBe('"café, Paris"')
      expect(escapeCsvField('日本語 "テスト"')).toBe('"日本語 ""テスト"""')
    })

    it('handles emoji', () => {
      expect(escapeCsvField('🎉 Party')).toBe('🎉 Party')
      expect(escapeCsvField('🎉, Party')).toBe('"🎉, Party"')
    })
  })

  describe('combined formula injection and escaping', () => {
    it('neutralizes formula injection before escaping', () => {
      expect(escapeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    })

    it('neutralizes and quotes formula with comma', () => {
      expect(escapeCsvField('=SUM(A1,A2)')).toBe("'=SUM(A1,A2)")
    })

    it('neutralizes and quotes formula with quote', () => {
      expect(escapeCsvField('="test"')).toBe("'=\"test\"")
    })
  })
})

describe('generateLedgerCsv', () => {
  const mockEntries: WalletLedgerEntry[] = [
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'payment',
      amountNgn: 150000.50,
      status: 'confirmed',
      reference: 'REF-001',
    },
    {
      id: '2',
      timestamp: '2024-01-16T14:45:00Z',
      type: 'refund',
      amountNgn: 50000.00,
      status: 'pending',
      reference: 'REF-002',
    },
  ]

  it('generates CSV with correct header', () => {
    const csv = generateLedgerCsv(mockEntries)
    const lines = csv.split('\r\n')
    
    expect(lines[0]).toBe('Date,Type,Amount (NGN),Status,Reference ID')
  })

  it('generates CSV with correct number of rows', () => {
    const csv = generateLedgerCsv(mockEntries)
    const lines = csv.split('\r\n')
    
    expect(lines).toHaveLength(3) // header + 2 data rows
  })

  it('formats dates correctly', () => {
    const csv = generateLedgerCsv(mockEntries)
    const lines = csv.split('\r\n')
    
    expect(lines[1]).toContain('2024-01-15')
    expect(lines[2]).toContain('2024-01-16')
  })

  it('formats amounts with 2 decimal places', () => {
    const csv = generateLedgerCsv(mockEntries)
    const lines = csv.split('\r\n')
    
    expect(lines[1]).toContain('150000.50')
    expect(lines[2]).toContain('50000.00')
  })

  it('handles entries with null reference', () => {
    const entriesWithNullRef: WalletLedgerEntry[] = [
      {
        id: '1',
        timestamp: '2024-01-15T10:30:00Z',
        type: 'payment',
        amountNgn: 150000.50,
        status: 'confirmed',
        reference: null,
      },
    ]
    
    const csv = generateLedgerCsv(entriesWithNullRef)
    const lines = csv.split('\r\n')
    
    expect(lines[1]).toContain('1') // Should use ID as fallback
  })

  it('handles entries with special characters in type', () => {
    const entriesWithSpecialChars: WalletLedgerEntry[] = [
      {
        id: '1',
        timestamp: '2024-01-15T10:30:00Z',
        type: 'payment, refund',
        amountNgn: 150000.50,
        status: 'confirmed',
        reference: 'REF-001',
      },
    ]
    
    const csv = generateLedgerCsv(entriesWithSpecialChars)
    const lines = csv.split('\r\n')
    
    expect(lines[1]).toContain('"payment, refund"')
  })

  it('handles entries with formula injection in reference', () => {
    const entriesWithFormula: WalletLedgerEntry[] = [
      {
        id: '1',
        timestamp: '2024-01-15T10:30:00Z',
        type: 'payment',
        amountNgn: 150000.50,
        status: 'confirmed',
        reference: '=SUM(A1:A10)',
      },
    ]
    
    const csv = generateLedgerCsv(entriesWithFormula)
    const lines = csv.split('\r\n')
    
    expect(lines[1]).toContain("'=SUM(A1:A10)")
  })

  it('handles empty entries array', () => {
    const csv = generateLedgerCsv([])
    const lines = csv.split('\r\n')
    
    expect(lines).toHaveLength(1) // Only header
    expect(lines[0]).toBe('Date,Type,Amount (NGN),Status,Reference ID')
  })

  it('uses CRLF line endings for Excel compatibility', () => {
    const csv = generateLedgerCsv(mockEntries)
    
    expect(csv).toContain('\r\n')
    expect(csv).not.toContain('\n')
  })

  it('maintains stable column ordering', () => {
    const csv = generateLedgerCsv(mockEntries)
    const lines = csv.split('\r\n')
    const header = lines[0]
    
    expect(header).toBe('Date,Type,Amount (NGN),Status,Reference ID')
  })
})

describe('edge cases', () => {
  it('handles very long text fields', () => {
    const longText = 'A'.repeat(10000)
    const escaped = escapeCsvField(longText)
    
    expect(escaped).toBe(longText)
  })

  it('handles fields with only special characters', () => {
    expect(escapeCsvField(',')).toBe('","')
    expect(escapeCsvField('"')).toBe('""""')
    expect(escapeCsvField('\n')).toBe('"\n"')
  })

  it('handles zero values', () => {
    expect(escapeCsvField(0)).toBe('0')
    expect(escapeCsvField('0')).toBe('0')
  })

  it('handles negative numbers', () => {
    expect(escapeCsvField(-100)).toBe('-100')
    expect(escapeCsvField('-100')).toBe("'-100") // Formula injection protection
  })

  it('handles scientific notation', () => {
    expect(escapeCsvField(1.5e10)).toBe('15000000000')
  })

  it('handles boolean values correctly', () => {
    expect(escapeCsvField(true)).toBe('true')
    expect(escapeCsvField(false)).toBe('false')
  })

  it('handles mixed content types', () => {
    const entries: WalletLedgerEntry[] = [
      {
        id: '1',
        timestamp: '2024-01-15T10:30:00Z',
        type: 'payment',
        amountNgn: 150000.50,
        status: 'confirmed',
        reference: 'REF-001',
      },
      {
        id: '2',
        timestamp: '2024-01-16T14:45:00Z',
        type: 'refund, partial',
        amountNgn: 50000.00,
        status: 'pending',
        reference: '=HYPERLINK("http://evil.com")',
      },
    ]
    
    const csv = generateLedgerCsv(entries)
    const lines = csv.split('\r\n')
    
    expect(lines[1]).toContain('payment')
    expect(lines[2]).toContain('"refund, partial"')
    expect(lines[2]).toContain("'=HYPERLINK(\"\"http://evil.com\"\")")
  })
})
