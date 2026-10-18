import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Loans',
  label: 'Loans',
  routes: [
    { path: 'loans', name: 'loans.index', meta: { title: 'Loans' }, component: () => import('./views/LoanListView.vue') },
    { path: 'loans/new', name: 'loans.create', meta: { title: 'New loan application' }, component: () => import('./views/LoanCreateView.vue') },
    { path: 'loans/products', name: 'loans.products', meta: { title: 'Loan products' }, component: () => import('./views/LoanProductListView.vue') },
  ],
  nav: [
    { label: 'Loans', to: { name: 'loans.index' }, icon: 'loan', section: 'main' },
    { label: 'Loan products', to: { name: 'loans.products' }, icon: 'layers', section: 'setup' },
  ],
})
