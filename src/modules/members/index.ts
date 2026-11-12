import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Members',
  label: 'Members',
  routes: [
    { path: 'members', name: 'members.index', meta: { title: 'Members' }, component: () => import('./views/MemberListView.vue') },
    { path: 'free-agents', name: 'members.free-agents', meta: { title: 'Free agents' }, props: { category: 'free_agent' }, component: () => import('./views/MemberListView.vue') },
    { path: 'members/:id(\\d+)', name: 'members.show', meta: { title: 'Member profile' }, props: true, component: () => import('./views/MemberProfileView.vue') },
  ],
  nav: [
    { label: 'Members', to: { name: 'members.index' }, icon: 'members', group: 'members', menu: { label: 'Members', icon: 'members', heading: 'Sacco members' } },
    { label: 'New member', to: { name: 'members.index', query: { create: '1' } }, icon: 'plus', group: 'members', menu: { label: 'Members', icon: 'members', heading: 'Sacco members' } },
    { label: 'Free agents', to: { name: 'members.free-agents' }, icon: 'wallet', group: 'members' },
  ],
})
