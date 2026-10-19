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
      description: 'Interest rates, minimum balances and the ledger account deposits post to.',
      icon: 'wallet',
      route: { path: 'savings-products', name: 'savings.products', meta: { title: 'Savings products' }, component: () => import('./views/SavingsProductListView.vue') },
    },
  ],
})
