
/** Format server decimals without passing through floating point. */
export function formatStatementMoney(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) return '—'
  const [, sign = '', whole = '0', fraction = ''] = match
  const zero = /^0+$/.test(whole) && /^0*$/.test(fraction)
  if (zero) return '—'
  const amount = `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
  return sign ? `(${amount})` : amount
}
export function safeSpreadsheetText(value: string): string {
  return /^[\s]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value
}
