import type { AppModule, SettingsPage } from '@/core/module'
import accounting from './accounting'
import expenses from './expenses'
import loans from './loans'
import members from './members'
import reports from './reports'
import savings from './savings'
import settings from './settings'
import shares from './shares'
import staff from './staff'
import { moduleStatuses } from './statuses'

const registered: AppModule[] = [members, staff, savings, loans, shares, accounting, expenses, reports, settings]

export const modules: AppModule[] = registered.filter((module) => moduleStatuses[module.name] !== false)

/** Settings modules listed first; the rest follow in registration order. */
const SETTINGS_ORDER = ['Settings', 'Loans', 'Savings', 'Shares', 'Expenses']

/** Every enabled module's Settings pages, the user's own account pages first. */
export const settingsPages: SettingsPage[] = [...modules]
  .sort((a, b) => settingsRank(a) - settingsRank(b))
  .flatMap((module) => module.settings ?? [])

function settingsRank(module: AppModule): number {
  const rank = SETTINGS_ORDER.indexOf(module.name)
  return rank === -1 ? SETTINGS_ORDER.length : rank
}
