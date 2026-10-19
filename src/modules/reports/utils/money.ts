/** Two-decimal amount with thousands separators, e.g. 1,280.00. */
export function formatMoneyValue(amount: number | string, minimumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-UG', { minimumFractionDigits, maximumFractionDigits: minimumFractionDigits }).format(Number(amount || 0))
}
