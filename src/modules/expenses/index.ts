import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Expenses',
  label: 'Expenses',
  routes: [
    { path: 'expenses', name: 'expenses.index', meta: { title: 'Expenses' }, component: () => import('./views/ExpenseListView.vue') },
    { path: 'expenses/new', name: 'expenses.create', meta: { title: 'Record expense' }, component: () => import('./views/ExpenseCreateView.vue') },
  ],
  nav: [
    { label: 'Manage expenses', to: { name: 'expenses.index' }, icon: 'receipt', group: 'financials' },
  ],
  settings: [
    {
      label: 'Expense categories',
      description: 'How expenses are grouped and the ledger account each category posts to.',
      icon: 'tag',
      route: { path: 'expense-categories', name: 'expenses.categories', meta: { title: 'Expense categories' }, component: () => import('./views/ExpenseCategoryListView.vue') },
    },
  ],
})
