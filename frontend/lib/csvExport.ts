import type { WalletLedgerEntry } from './walletApi'

/**
 * Neutralizes CSV formula injection by prefixing dangerous characters
 * 
 * Per OWASP guidance, cells starting with =, +, -, @, tab, or carriage return
 * can execute as formulas when opened in Excel/Sheets. We prefix these with
 * a single quote to force Excel/Sheets to treat them as text.
 * 
 * @param value - The field value to neutralize
 * @returns The neutralized value
 */
function neutralizeFormulaInjection(value: string): string {
  if (!value) return value
  
  // Check if the value starts with a formula-inducing character
  const firstChar = value.charAt(0)
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r']
  
  if (dangerousChars.includes(firstChar)) {
    return `'${value}`
  }
  
  return value
}

/**
 * Escapes a CSV field value according to RFC 4180
 * 
 * RFC 4180 rules:
 * - Fields containing commas, double quotes, or newlines must be enclosed in double quotes
 * - Double quotes within a quoted field must be escaped by preceding with another double quote
 * 
 * @param value - The field value to escape
 * @returns The properly escaped CSV field
 */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return ''
  }
  
  // Convert to string
  const stringValue = String(value)
  
  // Neutralize formula injection before escaping
  const neutralized = neutralizeFormulaInjection(stringValue)
  
  // Check if field needs quoting (contains comma, newline, double quote, or carriage return)
  const needsQuoting = /[,"\n\r]/.test(neutralized)
  
  if (needsQuoting) {
    // Escape double quotes by doubling them, then wrap in quotes
    return `"${neutralized.replaceAll('"', '""')}"`
  }
  
  return neutralized
}

/**
 * Formats a date string for CSV export
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string in ISO-like format
 */
function formatDateForCsv(dateString: string): string {
  const date = new Date(dateString)
  
  // Use ISO-like format for consistency and Excel compatibility
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Formats amount for CSV export
 * 
 * @param amountNgn - Amount in NGN
 * @returns Formatted amount string
 */
function formatAmountForCsv(amountNgn: number): string {
  return amountNgn.toFixed(2)
}

/**
 * Generates CSV content from ledger entries
 * 
 * @param entries - Array of wallet ledger entries
 * @returns CSV content as a string
 */
export function generateLedgerCsv(entries: WalletLedgerEntry[]): string {
  // CSV header - stable column ordering
  const headers = ['Date', 'Type', 'Amount (NGN)', 'Status', 'Reference ID']
  const headerRow = headers.map(escapeCsvField).join(',')

  // CSV rows
  const rows = entries.map((entry) => {
    const date = formatDateForCsv(entry.timestamp)
    const type = escapeCsvField(entry.type)
    const amount = formatAmountForCsv(entry.amountNgn)
    const status = escapeCsvField(entry.status)
    const referenceId = escapeCsvField(entry.reference || entry.id)

    return [date, type, amount, status, referenceId].join(',')
  })

  // Combine header and rows with CRLF line endings for better Excel compatibility
  return [headerRow, ...rows].join('\r\n')
}

/**
 * Triggers download of CSV file
 * 
 * @param content - CSV content string
 * @param filename - Desired filename for the download
 */
export function downloadCsv(content: string, filename: string): void {
  // Create blob with CSV content and UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  
  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  // Trigger download
  document.body.appendChild(link)
  link.click()
  link.remove()
  
  // Clean up URL
  URL.revokeObjectURL(url)
}
