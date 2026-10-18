import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { IconName } from '@/core/components/AppIcon.vue'

/** Sidebar group a navigation item belongs to. */
export type NavSection = 'main' | 'setup' | 'reports' | 'settings'

export interface NavItem {
  label: string
  to: RouteLocationRaw
  icon: IconName
  section: NavSection
}

/**
 * A frontend feature module, mirroring a backend `Modules/<Name>` package.
 */
export interface AppModule {
  /** Matches the backend module name in modules_statuses.json. */
  name: string
  label: string
  routes: RouteRecordRaw[]
  nav: NavItem[]
}

export function defineModule(module: AppModule): AppModule {
  return module
}
