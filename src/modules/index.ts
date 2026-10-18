import type { AppModule } from '@/core/module'
import accounting from './accounting'
import expenses from './expenses'
import loans from './loans'
import members from './members'
import reports from './reports'
import savings from './savings'
import settings from './settings'
import shares from './shares'
import { moduleStatuses } from './statuses'

const registered: AppModule[] = [members, savings, loans, shares, expenses, accounting, reports, settings]

export const modules: AppModule[] = registered.filter((module) => moduleStatuses[module.name] !== false)
