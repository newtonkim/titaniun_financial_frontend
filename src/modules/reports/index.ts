import { defineModule } from '@/core/module'

const menu = { label: 'Reports', icon: 'report', heading: 'Financial reports' } as const

export default defineModule({
  name: 'Reports',
  label: 'Reports',
  routes: [
    { path: 'reports/trial-balance', name: 'reports.trial-balance', meta: { title: 'Trial balance' }, component: () => import('./views/TrialBalanceView.vue') },
    { path: 'reports/income-statement', name: 'reports.income-statement', meta: { title: 'Income statement' }, component: () => import('./views/IncomeStatementView.vue') },
    { path: 'reports/balance-sheet', name: 'reports.balance-sheet', meta: { title: 'Balance sheet' }, component: () => import('./views/BalanceSheetView.vue') },
    { path: 'reports/cash-flow', name: 'reports.cash-flow', meta: { title: 'Cash flow' }, component: () => import('./views/CashFlowView.vue') },
  ],
  nav: [
    { label: 'Trial balance', to: { name: 'reports.trial-balance' }, icon: 'report', group: 'reports-settings', menu },
    { label: 'Income statement', to: { name: 'reports.income-statement' }, icon: 'report', group: 'reports-settings', menu },
    { label: 'Balance sheet', to: { name: 'reports.balance-sheet' }, icon: 'report', group: 'reports-settings', menu },
    { label: 'Cash flow', to: { name: 'reports.cash-flow' }, icon: 'report', group: 'reports-settings', menu },
  ],
})
