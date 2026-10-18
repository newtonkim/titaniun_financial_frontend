import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Savings',
  label: 'Savings',
  routes: [
    { path: 'savings/accounts', name: 'savings.accounts', meta: { title: 'Savings accounts' }, component: () => import('./views/SavingsAccountListView.vue') },
    { path: 'savings/products', name: 'savings.products', meta: { title: 'Savings products' }, component: () => import('./views/SavingsProductListView.vue') },
  ],
  nav: [
    { label: 'Savings accounts', to: { name: 'savings.accounts' }, icon: 'wallet', section: 'main' },
    { label: 'Savings products', to: { name: 'savings.products' }, icon: 'layers', section: 'setup' },
  ],
})
