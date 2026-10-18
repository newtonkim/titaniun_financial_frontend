import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Accounting',
  label: 'Accounting',
  routes: [
    { path: 'accounting/chart-of-accounts', name: 'accounting.chart-of-accounts', component: () => import('./views/ChartOfAccountListView.vue') },
    { path: 'accounting/journal-entries', name: 'accounting.journal-entries', component: () => import('./views/JournalEntryListView.vue') },
  ],
  nav: [
    { label: 'Chart of accounts', to: { name: 'accounting.chart-of-accounts' } },
    { label: 'Journal entries', to: { name: 'accounting.journal-entries' } },
  ],
})
