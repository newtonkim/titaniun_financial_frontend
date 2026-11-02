import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Expenses',
  label: 'Expenses',
  routes: [
    { path: 'expenses', name: 'expenses.index', meta: { title: 'Expenses' }, component: () => import('./views/ExpenseListView.vue') },
    { path: 'expenses/new', name: 'expenses.create', meta: { title: 'New expense voucher' }, component: () => import('./views/ExpenseFormView.vue') },
    { path: 'expenses/:id(\\d+)', name: 'expenses.show', meta: { title: 'Expense voucher' }, props: true, component: () => import('./views/ExpenseShowView.vue') },
    { path: 'expenses/:id(\\d+)/edit', name: 'expenses.edit', meta: { title: 'Edit expense voucher' }, props: true, component: () => import('./views/ExpenseFormView.vue') },
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
    {
      label: 'Suppliers',
      description: 'Who the SACCO pays, with tax identifiers and related-party flags.',
      icon: 'members',
      route: { path: 'suppliers', name: 'expenses.suppliers', meta: { title: 'Suppliers' }, component: () => import('./views/SupplierListView.vue') },
    },
  ],
})
