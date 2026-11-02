import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Accounting',
  label: 'Accounting',
  routes: [
    { path: 'accounting/chart-of-accounts', name: 'accounting.chart-of-accounts', meta: { title: 'Chart of accounts' }, component: () => import('./views/ChartOfAccountListView.vue') },
    { path: 'accounting/journal-entries', name: 'accounting.journal-entries', meta: { title: 'Journal entries' }, component: () => import('./views/JournalEntryListView.vue') },
  ],
  nav: [
    { label: 'Chart of accounts', to: { name: 'accounting.chart-of-accounts' }, icon: 'ledger', group: 'financials' },
    { label: 'Journal entries', to: { name: 'accounting.journal-entries' }, icon: 'journal', group: 'financials' },
  ],
  settings: [
    {
      label: 'Books and periods',
      description: 'Lock finished periods so nothing posts into them, and limit how far back vouchers can be dated.',
      icon: 'lock',
      route: { path: 'books', name: 'accounting.settings', meta: { title: 'Books and periods' }, component: () => import('./views/AccountingSettingsView.vue') },
    },
  ],
})
