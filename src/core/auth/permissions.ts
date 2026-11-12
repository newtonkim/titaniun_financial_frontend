/** Permission required to open a named application page. */
export function permissionForRoute(name: string): string | undefined {
  if (name === 'settings.roles' || name.startsWith('staff.')) return 'access.manage'
  if (name === 'dashboard') return 'dashboard.view'
  if (name === 'loans.commissions') return 'commissions.view'
  if (name === 'loans.create' || name === 'loans.edit') return 'loans.manage'
  if (name.startsWith('loans.products') || name === 'loans.settings') return 'loans.products.manage'
  if (name.startsWith('savings.products') || name === 'savings.settings') return 'savings.products.manage'
  if (name.startsWith('shares.products')) return 'shares.products.manage'
  if (name.startsWith('expenses.categories')) return 'expenses.categories.manage'
  if (name === 'accounting.receipts') return 'receipts.view'
  const area = name.split('.')[0]
  return ['members', 'loans', 'savings', 'shares', 'accounting', 'expenses', 'reports'].includes(area ?? '')
    ? `${area}.view`
    : undefined
}
