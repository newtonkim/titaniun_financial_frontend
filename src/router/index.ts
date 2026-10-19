import { createRouter, createWebHistory } from 'vue-router'
import { onUnauthorized } from '@/core/api/http'
import AppLayout from '@/core/layouts/AppLayout.vue'
import { modules, settingsPages } from '@/modules'
import { authRoutes } from '@/modules/auth/routes'
import { useAuth } from '@/modules/auth/store'

declare module 'vue-router' {
  interface RouteMeta {
    /** Only reachable when signed out. */
    guest?: boolean
    /** Page name shown in the breadcrumb. */
    title?: string
    /** The page fills the content area edge to edge, without the usual padding. */
    fullBleed?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...authRoutes,
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'dashboard', meta: { title: 'Dashboard' }, component: () => import('@/core/views/DashboardView.vue') },
        ...modules.flatMap((module) => module.routes),
        {
          path: 'settings',
          meta: { title: 'Settings', fullBleed: true },
          component: () => import('@/core/layouts/SettingsLayout.vue'),
          children: [
            { path: '', name: 'settings.index', meta: { title: 'Settings' }, component: () => import('@/core/views/SettingsHomeView.vue') },
            ...settingsPages.map((page) => page.route),
          ],
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()

  if (to.meta.guest) {
    return auth.isAuthenticated.value ? { name: 'dashboard' } : true
  }

  if (!auth.isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!auth.user.value) {
    try {
      await auth.loadUser()
    } catch {
      auth.forget()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  return true
})

onUnauthorized(() => {
  useAuth().forget()
  const current = router.currentRoute.value
  if (!current.meta.guest) router.replace({ name: 'login', query: { redirect: current.fullPath } })
})

export default router
