import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Settings',
  label: 'Settings',
  routes: [
    { path: 'settings', redirect: { name: 'settings.profile' } },
    { path: 'settings/profile', name: 'settings.profile', meta: { title: 'Profile' }, component: () => import('./views/ProfileView.vue') },
    { path: 'settings/security', name: 'settings.security', meta: { title: 'Security' }, component: () => import('./views/SecurityView.vue') },
  ],
  nav: [
    { label: 'Profile', to: { name: 'settings.profile' }, icon: 'user', section: 'settings' },
    { label: 'Security', to: { name: 'settings.security' }, icon: 'lock', section: 'settings' },
  ],
})
