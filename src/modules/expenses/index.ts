import { defineModule } from '@/core/module'

const menu = { label: 'Expenses', icon: 'receipt', heading: 'Expenses' } as const

export default defineModule({
  name: 'Expenses',
  label: 'Expenses',
  routes: [
    { path: 'expenses', name: 'expenses.index', meta: { title: 'Expenses' }, component: () => import('./views/ExpenseListView.vue') },
    { path: 'expenses/recurring', name: 'expenses.recurring', meta: { title: 'Recurring expenses' }, component: () => import('./views/RecurringExpenseListView.vue') },
    { path: 'expenses/:id(\\d+)', name: 'expenses.show', meta: { title: 'Expense' }, props: true, component: () => import('./views/ExpenseShowView.vue') },
  ],
  nav: [
    { label: 'All expenses', to: { name: 'expenses.index' }, icon: 'receipt', group: 'financials', menu },
    { label: 'Recurring expenses', to: { name: 'expenses.recurring' }, icon: 'receipt', group: 'financials', menu },
  ],
  settings: [
    {
      label: 'Expense categories',
      description: 'The headings expenses are grouped under, such as rent or transport.',
      icon: 'tag',
      route: { path: 'expense-categories', name: 'expenses.categories', meta: { title: 'Expense categories' }, component: () => import('./views/ExpenseCategoryListView.vue') },
    },
  ],
})
