import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Savings',
  label: 'Savings',
  routes: [
    { path: 'savings/accounts', name: 'savings.accounts', meta: { title: 'Savings accounts' }, component: () => import('./views/SavingsAccountListView.vue') },
    { path: 'savings/accounts/:id(\\d+)', name: 'savings.accounts.show', meta: { title: 'Savings account' }, props: true, component: () => import('./views/SavingsAccountShowView.vue') },
    { path: 'savings/dormant', name: 'savings.dormant', meta: { title: 'Dormant register' }, component: () => import('./views/SavingsDormantRegisterView.vue') },
    { path: 'savings/approvals', name: 'savings.approvals', meta: { title: 'Savings approvals' }, component: () => import('./views/SavingsApprovalsView.vue') },
  ],
  nav: [
    { label: 'Savings accounts', to: { name: 'savings.accounts' }, icon: 'wallet', group: 'savings' },
    { label: 'Dormant register', to: { name: 'savings.dormant' }, icon: 'layers', group: 'savings' },
    { label: 'Savings approvals', to: { name: 'savings.approvals' }, icon: 'clock', group: 'savings' },
  ],
  settings: [
    {
      label: 'Savings policy',
      description: 'Exit notice, interest on dormant accounts and the default inactivity warning.',
      icon: 'settings',
      route: { path: 'savings-policy', name: 'savings.policy', meta: { title: 'Savings policy' }, component: () => import('./views/settings/SavingsPolicyView.vue') },
    },
    {
      label: 'Savings products',
      description: 'Standard and fixed deposit products: fees, charges, maturity and accounts.',
      icon: 'wallet',
      route: { path: 'savings', name: 'savings.settings', meta: { title: 'Savings products' }, component: () => import('./views/settings/SavingsProductIndexView.vue') },
      subRoutes: [
        // The list used to sit one click behind a landing page; keep its old address working.
        { path: 'savings/products', name: 'savings.products', redirect: { name: 'savings.settings' } },
      ],
    },
  ],
})
