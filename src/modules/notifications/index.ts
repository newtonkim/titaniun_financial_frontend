import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Notifications',
  label: 'Notifications',
  routes: [
    { path: 'notifications', name: 'notifications.index', meta: { title: 'Notifications' }, component: () => import('./views/NotificationsView.vue') },
  ],
  nav: [],
})
