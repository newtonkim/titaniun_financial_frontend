import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Reports',
  label: 'Reports',
  routes: [{ path: 'reports/trial-balance', name: 'reports.trial-balance', component: () => import('./views/TrialBalanceView.vue') }],
  nav: [{ label: 'Trial balance', to: { name: 'reports.trial-balance' } }],
})
