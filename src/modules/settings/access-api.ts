import { http } from '@/core/api/http'
import type { Paginated, Wrapped } from '@/core/api/types'
import { permissions, accessAudit } from '@/generated/routes/api/v1/settings'
import { index, store, update, destroy } from '@/generated/routes/api/v1/settings/roles'
import { index as staffIndex, roles as staffRoles } from '@/generated/routes/api/v1/settings/staff'
import type { AccessActivity, AccessRole, PermissionGroup, RolePayload, StaffAccess } from './access-types'

const path = (url: string) => url.replace(/^\/api\/v1(?=\/)/, '')
export const accessApi = {
  roles: () => http.get<Wrapped<AccessRole[]>>(path(index.url())).then((result) => result.data),
  permissions: () => http.get<Wrapped<PermissionGroup[]>>(path(permissions.url())).then((result) => result.data),
  createRole: (payload: RolePayload) =>
    http.post<Wrapped<AccessRole>>(path(store.url()), payload).then((result) => result.data),
  updateRole: (id: number, payload: RolePayload) =>
    http.put<Wrapped<AccessRole>>(path(update.url(id)), payload).then((result) => result.data),
  deleteRole: (id: number) => http.delete(path(destroy.url(id))),
  staff: (page: number, search: string) => http.get<Paginated<StaffAccess>>(path(staffIndex.url()), { page, search }),
  assign: (id: number, roles: string[]) =>
    http.put<Wrapped<StaffAccess>>(path(staffRoles.url(id)), { roles }).then((result) => result.data),
  activity: () => http.get<Wrapped<AccessActivity[]>>(path(accessAudit.url())).then((result) => result.data),
}
