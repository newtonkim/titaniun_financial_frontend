import { defineModule } from '@/core/module'

/** Receipts here and loan invoices in Loans share one sidebar menu. */
export const billingMenu = { label: 'Receipts & invoices', icon: 'receipt', heading: 'Receipts & invoices' } as const

export default defineModule({
  name: 'Accounting',
  label: 'Accounting',
  routes: [
    { path: 'accounting/chart-of-accounts', name: 'accounting.chart-of-accounts', meta: { title: 'Chart of accounts' }, component: () => import('./views/ChartOfAccountListView.vue') },
    { path: 'accounting/journal-entries', name: 'accounting.journal-entries', meta: { title: 'Journal entries' }, component: () => import('./views/JournalEntryListView.vue') },
    { path: 'receipts', name: 'accounting.receipts', meta: { title: 'Receipts' }, component: () => import('./views/ReceiptListView.vue') },
  ],
  nav: [
    { label: 'Chart of accounts', to: { name: 'accounting.chart-of-accounts' }, icon: 'ledger', group: 'financials' },
    { label: 'Journal entries', to: { name: 'accounting.journal-entries' }, icon: 'journal', group: 'financials' },
    { label: 'Receipts', to: { name: 'accounting.receipts' }, icon: 'receipt', group: 'financials', menu: billingMenu },
  ],
  settings: [
    {
      label: 'Receipts and invoices',
      description: 'Business name, contacts and payment instructions printed on receipts and invoices, and where numbering starts.',
      icon: 'receipt',
      route: { path: 'receipts-and-invoices', name: 'accounting.receipt-settings', meta: { title: 'Receipts and invoices' }, component: () => import('./views/ReceiptSettingsView.vue') },
    },
    {
      label: 'Books and periods',
      description: 'Lock finished periods so nothing posts into them, and limit how far back vouchers can be dated.',
      icon: 'lock',
      route: { path: 'books', name: 'accounting.settings', meta: { title: 'Books and periods' }, component: () => import('./views/AccountingSettingsView.vue') },
    },
  ],
})
