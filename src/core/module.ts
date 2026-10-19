import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { IconName } from '@/core/components/AppIcon.vue'

/** Sidebar group a navigation item belongs to, listed in sidebar order. */
export const NAV_GROUPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'savings', label: 'Savings' },
  { id: 'loans-shares', label: 'Loans & Shares' },
  { id: 'financials', label: 'Financials' },
  { id: 'reports-settings', label: 'Reports & Settings' },
] as const

export type NavGroup = (typeof NAV_GROUPS)[number]['id']

export interface NavItem {
  label: string
  to: RouteLocationRaw
  icon: IconName
  group: NavGroup
  /**
   * The flyout menu this link sits in and its heading there. Links that share a menu label are
   * gathered into one flyout; a link without a menu shows directly in the sidebar.
   */
  menu?: { label: string; icon: IconName; heading: string }
}

/** A page in the Settings area: its route (relative to /settings) and its entry in the settings list. */
export interface SettingsPage {
  label: string
  description: string
  icon: IconName
  route: RouteRecordRaw & { name: string }
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
  settings?: SettingsPage[]
}

export function defineModule(module: AppModule): AppModule {
  return module
}
