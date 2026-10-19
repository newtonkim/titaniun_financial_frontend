import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Savings',
  label: 'Savings',
  routes: [
    { path: 'savings/accounts', name: 'savings.accounts', meta: { title: 'Savings accounts' }, component: () => import('./views/SavingsAccountListView.vue') },
  ],
  nav: [
    { label: 'Savings accounts', to: { name: 'savings.accounts' }, icon: 'wallet', group: 'savings' },
  ],
  settings: [
    {
      label: 'Savings products',
      description: 'Standard and fixed deposit products: fees, charges, maturity and accounts.',
      icon: 'wallet',
      route: { path: 'savings', name: 'savings.settings', meta: { title: 'Savings products' }, component: () => import('./views/settings/SavingsSettingsView.vue') },
      subRoutes: [
        { path: 'savings/products', name: 'savings.products', meta: { title: 'Savings products' }, component: () => import('./views/settings/SavingsProductIndexView.vue') },
      ],
    },
  ],
})
