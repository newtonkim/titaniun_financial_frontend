import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Shares',
  label: 'Shares',
  routes: [
    { path: 'shares/accounts', name: 'shares.accounts', meta: { title: 'Share accounts' }, component: () => import('./views/ShareAccountListView.vue') },
    { path: 'shares/register', name: 'shares.register', meta: { title: 'Share register' }, component: () => import('./views/ShareRegisterView.vue') },
    { path: 'shares/dividends', name: 'shares.dividends', meta: { title: 'Dividends' }, component: () => import('./views/DividendsView.vue') },
  ],
  nav: [
    { label: 'Share accounts', to: { name: 'shares.accounts' }, icon: 'shares', group: 'loans-shares', menu: { label: 'Manage shares', icon: 'shares', heading: 'Shares' } },
    { label: 'Share register', to: { name: 'shares.register' }, icon: 'shares', group: 'loans-shares', menu: { label: 'Manage shares', icon: 'shares', heading: 'Shares' } },
    { label: 'Dividends', to: { name: 'shares.dividends' }, icon: 'shares', group: 'loans-shares', menu: { label: 'Manage shares', icon: 'shares', heading: 'Shares' } },
  ],
  settings: [
    {
      label: 'Share products',
      description: 'Share price, minimum holding, and the share capital and payment accounts.',
      icon: 'shares',
      route: { path: 'share-products', name: 'shares.products', meta: { title: 'Share products' }, component: () => import('./views/ShareProductListView.vue') },
    },
  ],
})
