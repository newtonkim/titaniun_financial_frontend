import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Shares',
  label: 'Shares',
  routes: [
    { path: 'shares/accounts', name: 'shares.accounts', component: () => import('./views/ShareAccountListView.vue') },
    { path: 'shares/products', name: 'shares.products', component: () => import('./views/ShareProductListView.vue') },
  ],
  nav: [
    { label: 'Share accounts', to: { name: 'shares.accounts' } },
    { label: 'Share products', to: { name: 'shares.products' } },
  ],
})
