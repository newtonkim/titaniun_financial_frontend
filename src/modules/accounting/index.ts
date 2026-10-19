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
})
