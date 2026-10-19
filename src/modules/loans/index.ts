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
      description: 'Interest methods, repayment frequency, amount and term limits, and fees.',
      icon: 'loan',
      route: { path: 'loan-products', name: 'loans.products', meta: { title: 'Loan products' }, component: () => import('./views/LoanProductListView.vue') },
    },
  ],
})
