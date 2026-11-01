import { http } from '@/core/api/http'
import type { NotificationFeed } from './types'

export const notificationsApi = {
  list: () => http.get<NotificationFeed>('/notifications'),
  markAllRead: () => http.post<void>('/notifications/read'),
}
