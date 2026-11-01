import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Communication',
  label: 'Communication',
  routes: [
    { path: 'communication', name: 'communication.index', meta: { title: 'Communication' }, component: () => import('./views/CommunicationView.vue') },
  ],
  nav: [
    { label: 'Communication', to: { name: 'communication.index' }, icon: 'message', group: 'reports-settings' },
  ],
})
