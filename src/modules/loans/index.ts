import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Loans',
  label: 'Loans',
  routes: [
    { path: 'loans', name: 'loans.index', meta: { title: 'Loans' }, component: () => import('./views/LoanListView.vue') },
    { path: 'loans/new', name: 'loans.create', meta: { title: 'New loan application' }, component: () => import('./views/LoanCreateView.vue') },
  ],
  nav: [
    { label: 'Loans', to: { name: 'loans.index' }, icon: 'loan', group: 'loans-shares', menu: { label: 'Manage loans', icon: 'loan', heading: 'Loans' } },
    { label: 'New loan application', to: { name: 'loans.create' }, icon: 'plus', group: 'loans-shares', menu: { label: 'Manage loans', icon: 'loan', heading: 'Loans' } },
  ],
  settings: [
    {
      label: 'Loan products',
      description: 'Loan types: pricing, terms, fees, penalties, eligibility and accounting.',
      icon: 'loan',
      route: { path: 'loans', name: 'loans.settings', meta: { title: 'Loan products' }, component: () => import('./views/settings/LoanSettingsView.vue') },
      subRoutes: [
        { path: 'loans/products', name: 'loans.products', meta: { title: 'Loan products' }, component: () => import('./views/settings/LoanProductIndexView.vue') },
        { path: 'loans/products/new', name: 'loans.products.create', meta: { title: 'Create loan product' }, component: () => import('./views/settings/LoanProductFormView.vue') },
        { path: 'loans/products/:id(\\d+)', name: 'loans.products.show', meta: { title: 'Loan product' }, component: () => import('./views/settings/LoanProductShowView.vue') },
        { path: 'loans/products/:id(\\d+)/edit', name: 'loans.products.edit', meta: { title: 'Edit loan product' }, component: () => import('./views/settings/LoanProductFormView.vue') },
      ],
    },
  ],
})
