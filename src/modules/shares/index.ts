import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Shares',
  label: 'Shares',
  routes: [
    { path: 'shares/accounts', name: 'shares.accounts', meta: { title: 'Share accounts' }, component: () => import('./views/ShareAccountListView.vue') },
    { path: 'shares/products', name: 'shares.products', meta: { title: 'Share products' }, component: () => import('./views/ShareProductListView.vue') },
  ],
  nav: [
    { label: 'Share accounts', to: { name: 'shares.accounts' }, icon: 'shares', section: 'main' },
    { label: 'Share products', to: { name: 'shares.products' }, icon: 'layers', section: 'setup' },
  ],
})
