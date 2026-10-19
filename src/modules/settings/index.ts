import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Settings',
  label: 'Settings',
  routes: [],
  nav: [{ label: 'Settings', to: { name: 'settings.index' }, icon: 'settings', group: 'reports-settings' }],
  settings: [
    {
      label: 'Profile',
      description: 'Your name and the email address you sign in with.',
      icon: 'user',
      route: { path: 'profile', name: 'settings.profile', meta: { title: 'Profile' }, component: () => import('./views/ProfileView.vue') },
    },
    {
      label: 'Security',
      description: 'Change your password and sign out other devices.',
      icon: 'lock',
      route: { path: 'security', name: 'settings.security', meta: { title: 'Security' }, component: () => import('./views/SecurityView.vue') },
    },
  ],
})
