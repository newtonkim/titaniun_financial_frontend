import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Expenses',
  label: 'Expenses',
  routes: [
    { path: 'expenses', name: 'expenses.index', meta: { title: 'Expenses' }, component: () => import('./views/ExpenseListView.vue') },
    { path: 'expenses/new', name: 'expenses.create', meta: { title: 'Record expense' }, component: () => import('./views/ExpenseCreateView.vue') },
    { path: 'expenses/categories', name: 'expenses.categories', meta: { title: 'Expense categories' }, component: () => import('./views/ExpenseCategoryListView.vue') },
  ],
  nav: [
    { label: 'Expenses', to: { name: 'expenses.index' }, icon: 'receipt', section: 'main' },
    { label: 'Expense categories', to: { name: 'expenses.categories' }, icon: 'tag', section: 'setup' },
  ],
})
