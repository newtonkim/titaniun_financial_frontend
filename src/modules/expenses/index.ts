import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Expenses',
  label: 'Expenses',
  routes: [
    { path: 'expenses', name: 'expenses.index', component: () => import('./views/ExpenseListView.vue') },
    { path: 'expenses/new', name: 'expenses.create', component: () => import('./views/ExpenseCreateView.vue') },
    { path: 'expenses/categories', name: 'expenses.categories', component: () => import('./views/ExpenseCategoryListView.vue') },
  ],
  nav: [
    { label: 'Expenses', to: { name: 'expenses.index' } },
    { label: 'Expense categories', to: { name: 'expenses.categories' } },
  ],
})
