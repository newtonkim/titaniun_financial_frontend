/**
 * Mirrors the backend's modules_statuses.json: set a module to false to hide its routes and navigation.
 */
export const moduleStatuses: Record<string, boolean> = {
  Members: true,
  Accounting: true,
  Loans: true,
  Savings: true,
  Shares: true,
  Expenses: true,
  Reports: true,
  Settings: true,
}
