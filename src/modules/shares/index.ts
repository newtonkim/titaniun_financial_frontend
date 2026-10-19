import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Shares',
  label: 'Shares',
  routes: [
    { path: 'shares/accounts', name: 'shares.accounts', meta: { title: 'Share accounts' }, component: () => import('./views/ShareAccountListView.vue') },
  ],
  nav: [
    { label: 'Share accounts', to: { name: 'shares.accounts' }, icon: 'shares', group: 'loans-shares', menu: { label: 'Manage shares', icon: 'shares', heading: 'Shares' } },
  ],
  settings: [
    {
      label: 'Share products',
      description: 'Nominal share price, minimum holding and the share capital account.',
      icon: 'shares',
      route: { path: 'share-products', name: 'shares.products', meta: { title: 'Share products' }, component: () => import('./views/ShareProductListView.vue') },
    },
  ],
})
