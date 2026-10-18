import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'

export interface NavItem {
  label: string
  to: RouteLocationRaw
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
