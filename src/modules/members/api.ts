import { download, http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Collection, Wrapped } from '@/core/api/types'
import type { Member, MemberFilters, MemberImportResult, MemberTransaction, StoreMemberPayload, UpdateMemberPayload } from './types'

export const membersApi = {
  ...createResourceApi<Member, StoreMemberPayload, UpdateMemberPayload, MemberFilters>('/members'),
  uploadAvatar: (id: number, file: File) => {
    const body = new FormData()
    body.append('avatar', file)
    return http.post<Wrapped<Member>>(`/members/${id}/avatar`, body).then((response) => response.data)
  },
  approve: (id: number) => http.put<Wrapped<Member>>(`/members/${id}/approve`).then((response) => response.data),
  reject: (id: number, rejection_reason: string | null) =>
    http.put<Wrapped<Member>>(`/members/${id}/reject`, { rejection_reason }).then((response) => response.data),
  requeue: (id: number) => http.put<Wrapped<Member>>(`/members/${id}/requeue`).then((response) => response.data),
  markDormant: (id: number) => http.put<Wrapped<Member>>(`/members/${id}/dormant`).then((response) => response.data),
  activate: (id: number) => http.put<Wrapped<Member>>(`/members/${id}/activate`).then((response) => response.data),
  transactions: (id: number) => http.get<Collection<MemberTransaction>>(`/members/${id}/transactions`).then((response) => response.data),
  downloadTemplate: () => download('/members/import-template', 'member-import-template.xlsx'),
  import: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return http.post<Wrapped<MemberImportResult>>('/members/import', body).then((response) => response.data)
  },
}
