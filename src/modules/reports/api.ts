import { http } from '@/core/api/http'
import type { ISODate, Wrapped } from '@/core/api/types'
import type { DashboardSummary, TrialBalance } from './types'

export const reportsApi = {
  dashboard: (months: 6 | 12 = 6) => http.get<Wrapped<DashboardSummary>>('/reports/dashboard', { months }).then((response) => response.data),
  trialBalance: (asOf?: ISODate) => http.get<Wrapped<TrialBalance>>('/reports/trial-balance', { as_of: asOf }).then((response) => response.data),
}
