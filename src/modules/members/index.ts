import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Members',
  label: 'Members',
  routes: [
    { path: 'members', name: 'members.index', meta: { title: 'Members' }, component: () => import('./views/MemberListView.vue') },
    { path: 'members/new', name: 'members.create', meta: { title: 'New member' }, component: () => import('./views/MemberCreateView.vue') },
  ],
  nav: [
    { label: 'Members', to: { name: 'members.index' }, icon: 'members', group: 'members', menu: { label: 'Members', icon: 'members', heading: 'Sacco members' } },
    { label: 'New member', to: { name: 'members.create' }, icon: 'plus', group: 'members', menu: { label: 'Members', icon: 'members', heading: 'Sacco members' } },
  ],
})
