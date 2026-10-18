import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Savings',
  label: 'Savings',
  routes: [
    { path: 'savings/accounts', name: 'savings.accounts', component: () => import('./views/SavingsAccountListView.vue') },
    { path: 'savings/products', name: 'savings.products', component: () => import('./views/SavingsProductListView.vue') },
  ],
  nav: [
    { label: 'Savings accounts', to: { name: 'savings.accounts' } },
    { label: 'Savings products', to: { name: 'savings.products' } },
  ],
})
