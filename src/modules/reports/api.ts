import { http } from '@/core/api/http'
import type { ISODate, Wrapped } from '@/core/api/types'
import type { TrialBalance } from './types'

export const reportsApi = {
  trialBalance: (asOf?: ISODate) => http.get<Wrapped<TrialBalance>>('/reports/trial-balance', { as_of: asOf }).then((response) => response.data),
}
