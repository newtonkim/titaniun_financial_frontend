import { defineModule } from '@/core/module'

export default defineModule({
  name: 'Staff',
  label: 'Staff',
  routes: [
    { path: 'staff', name: 'staff.index', meta: { title: 'Staff' }, component: () => import('./views/StaffListView.vue') },
  ],
  nav: [{ label: 'Staff', to: { name: 'staff.index' }, icon: 'user', group: 'members' }],
})
