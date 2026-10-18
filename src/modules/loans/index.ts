import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Loans',
  label: 'Loans',
  routes: [
    { path: 'loans', name: 'loans.index', component: () => import('./views/LoanListView.vue') },
    { path: 'loans/new', name: 'loans.create', component: () => import('./views/LoanCreateView.vue') },
    { path: 'loans/products', name: 'loans.products', component: () => import('./views/LoanProductListView.vue') },
  ],
  nav: [
    { label: 'Loans', to: { name: 'loans.index' } },
    { label: 'Loan products', to: { name: 'loans.products' } },
  ],
})
