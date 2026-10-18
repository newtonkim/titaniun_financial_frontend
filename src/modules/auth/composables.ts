import { useRoute, useRouter } from 'vue-router'

/** Navigate to the page the user originally asked for, or the dashboard. */
export function useAfterAuthRedirect() {
  const route = useRoute()
  const router = useRouter()

  return () => {
    const redirect = route.query.redirect
    return router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
  }
}
