import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Loans',
  label: 'Loans',
  routes: [
    {
      path: 'loan-commissions',
      name: 'loans.commissions',
      meta: { title: 'Loan commissions' },
      component: () => import('./views/LoanCommissionsView.vue'),
    },
    {
      path: 'loan-collections',
      name: 'loans.collections',
      meta: { title: 'Collections' },
      component: () => import('./views/LoanCollectionsView.vue'),
    },
    {
      path: 'loans',
      name: 'loans.index',
      meta: { title: 'Loans' },
      component: () => import('./views/LoanListView.vue'),
    },
    {
      path: 'loans/:id(\\d+)',
      name: 'loans.show',
      meta: { title: 'Loan application' },
      component: () => import('./views/LoanShowView.vue'),
    },
    {
      path: 'loans/:id(\\d+)/edit',
      name: 'loans.edit',
      meta: { title: 'Edit loan application' },
      component: () => import('./views/LoanApplicationView.vue'),
    },
    {
      path: 'loans/new',
      name: 'loans.create',
      meta: { title: 'New loan application' },
      component: () => import('./views/LoanApplicationView.vue'),
    },
  ],
  nav: [
    {
      label: 'Commissions',
      to: { name: 'loans.commissions' },
      icon: 'loan',
      group: 'loans-shares',
      menu: { label: 'Manage loans', icon: 'loan', heading: 'Loans' },
    },
    {
      label: 'Loans',
      to: { name: 'loans.index' },
      icon: 'loan',
      group: 'loans-shares',
      menu: { label: 'Manage loans', icon: 'loan', heading: 'Loans' },
    },
    {
      label: 'Collections',
      to: { name: 'loans.collections' },
      icon: 'clock',
      group: 'loans-shares',
      menu: { label: 'Manage loans', icon: 'loan', heading: 'Loans' },
    },
    {
      label: 'New loan application',
      to: { name: 'loans.create' },
      icon: 'plus',
      group: 'loans-shares',
      menu: { label: 'Manage loans', icon: 'loan', heading: 'Loans' },
    },
  ],
  settings: [
    {
      label: 'Loan products',
      description: 'Loan types: pricing, terms, fees, penalties, eligibility and accounting.',
      icon: 'loan',
      route: {
        path: 'loans',
        name: 'loans.settings',
        meta: { title: 'Loan products' },
        component: () => import('./views/settings/LoanSettingsView.vue'),
      },
      subRoutes: [
        {
          path: 'loans/products',
          name: 'loans.products',
          meta: { title: 'Loan products' },
          component: () => import('./views/settings/LoanProductIndexView.vue'),
        },
        {
          path: 'loans/products/:id(\\d+)',
          name: 'loans.products.show',
          meta: { title: 'Loan product' },
          component: () => import('./views/settings/LoanProductShowView.vue'),
        },
      ],
    },
  ],
})
