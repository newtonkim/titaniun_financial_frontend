import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Members',
  label: 'Members',
  routes: [
    { path: 'members', name: 'members.index', component: () => import('./views/MemberListView.vue') },
    { path: 'members/new', name: 'members.create', component: () => import('./views/MemberCreateView.vue') },
  ],
  nav: [{ label: 'Members', to: { name: 'members.index' } }],
})
