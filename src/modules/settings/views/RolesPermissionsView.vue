<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { ApiError } from '@/core/api/http'
import type { PaginationMeta } from '@/core/api/types'
import { formatDate, formatEnum, formatTime } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { accessApi } from '../access-api'
import type { AccessActivity, AccessRole, PermissionGroup, RolePayload, StaffAccess } from '../access-types'

const auth = useAuth()
const router = useRouter()
const roles = ref<AccessRole[]>([])
const permissionGroups = ref<PermissionGroup[]>([])
const staff = ref<StaffAccess[]>([])
const activity = ref<AccessActivity[]>([])
const meta = ref<PaginationMeta | null>(null)
const tab = ref('roles')
const search = ref('')
const loading = ref(true)
const loadingStaff = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const roleOpen = ref(false)
const assignOpen = ref(false)
const editingRole = ref<AccessRole | null>(null)
const editingStaff = ref<StaffAccess | null>(null)
const deleting = ref<number | null>(null)
const permissionSearch = ref('')
const roleErrors = ref<Record<string, string[]>>({})
const roleError = ref('')
const staffError = ref('')
const form = reactive<RolePayload>({ name: '', description: '', permissions: [] })
const selectedRoles = ref<string[]>([])
let searchTimer: ReturnType<typeof setTimeout> | undefined
let staffSequence = 0
let disposed = false
const administratorRole = computed(() => editingRole.value?.name === 'administrator')
const permissionCount = computed(() =>
  permissionGroups.value.reduce((count, group) => count + group.permissions.length, 0),
)
const filteredRoles = computed(() =>
  roles.value.filter((role) =>
    `${role.label} ${role.name} ${role.description ?? ''}`.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
const visibleGroups = computed(() =>
  permissionGroups.value
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        `${group.name} ${permission.label} ${permission.name}`
          .toLowerCase()
          .includes(permissionSearch.value.toLowerCase()),
      ),
    }))
    .filter((group) => group.permissions.length),
)
const effectiveCount = computed(
  () =>
    new Set(roles.value.filter((role) => selectedRoles.value.includes(role.name)).flatMap((role) => role.permissions))
      .size,
)
const filteredActivity = computed(() =>
  activity.value.filter((item) =>
    `${item.subject} ${item.actor} ${item.action}`.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

function failure(value: unknown): string {
  if (value instanceof ApiError) return Object.values(value.errors)[0]?.[0] ?? value.message
  return value instanceof Error ? value.message : 'The request could not be completed. Please try again.'
}
async function loadStaff(page = 1) {
  const request = ++staffSequence
  loadingStaff.value = true
  try {
    const result = await accessApi.staff(page, search.value.trim())
    if (disposed || request !== staffSequence) return
    staff.value = result.data
    meta.value = result.meta
  } catch (value) {
    if (!disposed && request === staffSequence) error.value = failure(value)
  } finally {
    if (!disposed && request === staffSequence) loadingStaff.value = false
  }
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [roleData, permissionData, activityData] = await Promise.all([
      accessApi.roles(),
      accessApi.permissions(),
      accessApi.activity(),
    ])
    if (disposed) return
    roles.value = roleData
    permissionGroups.value = permissionData
    activity.value = activityData
    await loadStaff()
  } catch (value) {
    error.value = failure(value)
  } finally {
    loading.value = false
  }
}
async function refreshAfterChange() {
  await auth.loadUser()
  if (!auth.can('access.manage')) {
    await router.replace({ name: 'settings.index' })
    return
  }
  const [roleData, activityData] = await Promise.all([accessApi.roles(), accessApi.activity()])
  roles.value = roleData
  activity.value = activityData
  await loadStaff(meta.value?.current_page ?? 1)
}
function editRole(role: AccessRole | null) {
  editingRole.value = role
  Object.assign(form, {
    name: role?.name ?? '',
    description: role?.description ?? '',
    permissions: [...(role?.permissions ?? [])],
  })
  roleError.value = ''
  roleErrors.value = {}
  permissionSearch.value = ''
  roleOpen.value = true
}
function toggleGroup(group: PermissionGroup) {
  const names = group.permissions.map((permission) => permission.name)
  const allSelected = names.every((name) => form.permissions.includes(name))
  form.permissions = allSelected
    ? form.permissions.filter((name) => !names.includes(name))
    : [...new Set([...form.permissions, ...names])]
}
async function saveRole() {
  if (busy.value || administratorRole.value) return
  busy.value = true
  roleError.value = ''
  roleErrors.value = {}
  try {
    if (editingRole.value) await accessApi.updateRole(editingRole.value.id, { ...form })
    else await accessApi.createRole({ ...form })
    roleOpen.value = false
    notice.value = editingRole.value ? 'Role permissions updated.' : 'Role created. You can now assign it to staff.'
    await refreshAfterChange()
  } catch (value) {
    roleError.value = failure(value)
    if (value instanceof ApiError) roleErrors.value = value.errors
  } finally {
    busy.value = false
  }
}
async function removeRole(role: AccessRole) {
  busy.value = true
  error.value = ''
  try {
    await accessApi.deleteRole(role.id)
    deleting.value = null
    notice.value = `${role.label} was deleted.`
    await refreshAfterChange()
  } catch (value) {
    error.value = failure(value)
  } finally {
    busy.value = false
  }
}
function editStaff(person: StaffAccess) {
  editingStaff.value = person
  selectedRoles.value = [...person.roles]
  staffError.value = ''
  assignOpen.value = true
}
async function saveStaff() {
  if (!editingStaff.value || busy.value) return
  busy.value = true
  staffError.value = ''
  try {
    await accessApi.assign(editingStaff.value.id, selectedRoles.value)
    assignOpen.value = false
    notice.value = `Access updated for ${editingStaff.value.name}.`
    await refreshAfterChange()
  } catch (value) {
    staffError.value = failure(value)
  } finally {
    busy.value = false
  }
}
function activitySummary(item: AccessActivity) {
  if (item.after.roles)
    return `${item.before.roles?.map(formatEnum).join(', ') || 'No roles'} → ${item.after.roles.map(formatEnum).join(', ') || 'No roles'}`
  return `${item.before.permissions?.length ?? 0} → ${item.after.permissions?.length ?? 0} permissions`
}
watch([search, tab], () => {
  clearTimeout(searchTimer)
  deleting.value = null
  if (tab.value === 'staff') searchTimer = setTimeout(() => void loadStaff(), 250)
})
onMounted(load)
onBeforeUnmount(() => {
  disposed = true
  ++staffSequence
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="access-page">
    <header class="access-heading">
      <div class="access-heading__intro">
        <span class="access-heading__icon"><ShieldCheck :size="23" /></span>
        <div>
          <h2>Roles & permissions</h2>
          <p>Give your team the access they need to do their work.</p>
        </div>
      </div>
      <button type="button" class="btn btn--primary access-create" :disabled="loading || busy" @click="editRole(null)">
        <Plus :size="16" />Create role
      </button>
    </header>
    <p v-if="error" class="alert alert--error" role="alert">
      {{ error }} <button type="button" class="access-text-button" @click="load">Try again</button>
    </p>
    <p v-if="notice" class="access-success" role="status"><Check :size="16" />{{ notice }}</p>
    <div class="access-overview">
      <span
        ><strong>{{ roles.length }}</strong> roles</span
      ><span
        ><strong>{{ permissionCount }}</strong> permissions</span
      ><span
        ><strong>{{ meta?.total ?? '—' }}</strong> staff accounts</span
      ><span class="access-overview__note"><LockKeyhole :size="14" />Changes apply across the system</span>
    </div>
    <div v-if="loading" class="access-loading" role="status" aria-label="Loading roles and permissions">
      <div v-for="index in 4" :key="index" />
    </div>
    <TabsRoot v-else v-model="tab" class="access-panel">
      <div class="access-toolbar">
        <TabsList class="access-tabs" aria-label="Access management"
          ><TabsTrigger value="roles"><ShieldCheck :size="15" />Roles</TabsTrigger
          ><TabsTrigger value="staff"><Users :size="15" />Staff access</TabsTrigger
          ><TabsTrigger value="activity"><History :size="15" />Activity</TabsTrigger></TabsList
        ><label class="access-search"
          ><Search :size="16" /><input
            v-model="search"
            type="search"
            :placeholder="
              tab === 'staff'
                ? 'Find staff by name or email…'
                : tab === 'roles'
                  ? 'Search roles…'
                  : 'Search recent activity…'
            "
            :aria-label="`Search ${tab}`"
        /></label>
      </div>
      <TabsContent value="roles"
        ><div class="access-table-wrap">
          <table class="access-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Permissions</th>
                <th>Staff</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in filteredRoles" :key="role.id">
                <td>
                  <div class="access-role-name">
                    <strong>{{ role.label }}</strong
                    ><span v-if="role.protected" class="access-badge">Built-in</span>
                  </div>
                  <p class="access-secondary">
                    {{
                      role.description ||
                      (role.name === 'administrator'
                        ? 'Full system access and staff administration.'
                        : 'A defined set of access permissions.')
                    }}
                  </p>
                </td>
                <td>
                  <span class="access-count">{{ role.permissions.length }}</span
                  ><span class="access-secondary"> of {{ permissionCount }}</span>
                </td>
                <td>{{ role.users_count }}</td>
                <td>
                  <div class="access-row-actions">
                    <button
                      type="button"
                      class="access-action"
                      :aria-label="`${role.name === 'administrator' ? 'View' : 'Edit'} ${role.label}`"
                      :disabled="busy"
                      @click="editRole(role)"
                    >
                      <Pencil :size="15" />{{ role.name === 'administrator' ? 'View' : 'Edit' }}</button
                    ><template v-if="!role.protected"
                      ><button
                        v-if="deleting !== role.id"
                        type="button"
                        class="access-action access-action--danger"
                        :disabled="busy || role.users_count > 0"
                        :title="role.users_count ? 'Remove staff assignments before deleting this role' : 'Delete role'"
                        :aria-label="`Delete ${role.label}`"
                        @click="deleting = role.id"
                      >
                        <Trash2 :size="15" /></button
                      ><template v-else
                        ><button
                          type="button"
                          class="access-action access-action--danger"
                          :disabled="busy"
                          @click="removeRole(role)"
                        >
                          Confirm delete</button
                        ><button type="button" class="access-action" :disabled="busy" @click="deleting = null">
                          Cancel
                        </button></template
                      ></template
                    >
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredRoles.length">
                <td colspan="4" class="access-empty">No roles match your search.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="access-footnote">
          Staff inherit the combined permissions of their assigned roles. Built-in roles stay available; custom roles
          can be removed once unassigned.
        </p></TabsContent
      >
      <TabsContent value="staff"
        ><div class="access-table-wrap" :aria-busy="loadingStaff">
          <table class="access-table">
            <thead>
              <tr>
                <th>Staff account</th>
                <th>Assigned roles</th>
                <th>Status</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="person in staff" :key="person.id">
                <td>
                  <strong>{{ person.name }}</strong>
                  <p class="access-secondary">{{ person.email }}</p>
                </td>
                <td>
                  <div class="access-role-tags">
                    <span v-for="role in person.roles" :key="role" class="access-badge">{{ formatEnum(role) }}</span
                    ><span v-if="!person.roles.length" class="access-secondary">No roles assigned</span>
                  </div>
                </td>
                <td>
                  <span class="access-badge" :class="{ 'access-badge--approved': person.approved_at }">{{
                    person.approved_at ? 'Approved' : 'Awaiting approval'
                  }}</span>
                </td>
                <td>
                  <button
                    type="button"
                    class="access-action"
                    :disabled="busy || !person.approved_at"
                    @click="editStaff(person)"
                  >
                    <Pencil :size="15" />Assign roles
                  </button>
                </td>
              </tr>
              <tr v-if="!staff.length">
                <td colspan="4" class="access-empty">
                  {{ loadingStaff ? 'Loading staff…' : 'No staff accounts match your search.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="meta" class="access-pagination">
          <span>{{ meta.total }} accounts · page {{ meta.current_page }} of {{ meta.last_page }}</span>
          <div>
            <button
              type="button"
              class="access-action"
              aria-label="Previous staff page"
              :disabled="loadingStaff || meta.current_page <= 1"
              @click="loadStaff(meta.current_page - 1)"
            >
              <ChevronLeft :size="17" /></button
            ><button
              type="button"
              class="access-action"
              aria-label="Next staff page"
              :disabled="loadingStaff || meta.current_page >= meta.last_page"
              @click="loadStaff(meta.current_page + 1)"
            >
              <ChevronRight :size="17" />
            </button>
          </div></div
      ></TabsContent>
      <TabsContent value="activity"
        ><div class="access-table-wrap">
          <table class="access-table">
            <thead>
              <tr>
                <th>Change</th>
                <th>Made by</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredActivity" :key="item.id">
                <td>
                  <strong>{{ formatEnum(item.action) }} · {{ formatEnum(item.subject) }}</strong>
                  <p class="access-secondary">{{ activitySummary(item) }}</p>
                </td>
                <td>{{ item.actor }}</td>
                <td>
                  {{ formatDate(item.created_at) }}
                  <p class="access-secondary">{{ formatTime(item.created_at) }}</p>
                </td>
              </tr>
              <tr v-if="!filteredActivity.length">
                <td colspan="3" class="access-empty">No recent access changes to show.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="access-footnote">
          The latest 30 changes are shown. Each record retains the previous and updated access.
        </p></TabsContent
      >
    </TabsRoot>

    <AppDrawer
      v-model:open="roleOpen"
      :title="editingRole ? `${administratorRole ? 'View' : 'Edit'} ${editingRole.label}` : 'Create role'"
      description="Choose the permissions everyone assigned to this role will inherit."
      width="left-0 max-h-dvh w-[100dvw] sm:left-auto sm:w-full sm:max-w-[760px]"
      :loading="busy"
      :show-footer="!administratorRole"
      :save-button-text="editingRole ? 'Save permissions' : 'Create role'"
      @save="saveRole"
    >
      <div class="access-editor">
        <p v-if="roleError" class="alert alert--error" role="alert">{{ roleError }}</p>
        <div class="access-editor-fields">
          <label
            >Role name<input
              v-model="form.name"
              :disabled="editingRole?.protected"
              required
              maxlength="80"
              placeholder="e.g. Collections officer"
            /><small v-if="roleErrors.name">{{ roleErrors.name[0] }}</small></label
          ><label
            >Description<textarea
              v-model="form.description"
              rows="2"
              maxlength="500"
              :disabled="administratorRole"
              placeholder="What this team is responsible for"
            />
          </label>
        </div>
        <div v-if="administratorRole" class="access-info">
          <LockKeyhole :size="17" /><span
            >The administrator role retains every permission. Assign another administrator before removing the final
            administrator from this role.</span
          >
        </div>
        <div class="access-permission-heading">
          <div>
            <h3>Permissions</h3>
            <p>{{ form.permissions.length }} of {{ permissionCount }} selected</p>
          </div>
          <label class="access-search"
            ><Search :size="16" /><input
              v-model="permissionSearch"
              type="search"
              placeholder="Find a permission…"
              aria-label="Find a permission"
          /></label>
        </div>
        <fieldset
          v-for="group in visibleGroups"
          :key="group.name"
          class="access-permission-group"
          :disabled="busy || administratorRole"
        >
          <legend>{{ group.name }}</legend>
          <button v-if="!administratorRole" type="button" class="access-text-button" @click="toggleGroup(group)">
            {{
              group.permissions.every((permission) => form.permissions.includes(permission.name))
                ? 'Clear group'
                : 'Select group'
            }}</button
          ><label v-for="permission in group.permissions" :key="permission.name" class="access-checkbox"
            ><input v-model="form.permissions" type="checkbox" :value="permission.name" /><span
              >{{ permission.label
              }}<small v-if="permission.name === 'access.manage'"
                >Allows changes to roles and staff access across the system.</small
              ></span
            ></label
          >
        </fieldset>
        <p v-if="!visibleGroups.length" class="access-empty">No permissions match your search.</p>
      </div>
    </AppDrawer>
    <AppDrawer
      v-model:open="assignOpen"
      :title="`Access for ${editingStaff?.name ?? 'staff'}`"
      description="A staff account can hold several roles. Their permissions are combined."
      :loading="busy"
      width="left-0 max-h-dvh w-[100dvw] sm:left-auto sm:w-full sm:max-w-[520px]"
      save-button-text="Save staff access"
      @save="saveStaff"
      ><div class="access-editor">
        <p v-if="staffError" class="alert alert--error" role="alert">{{ staffError }}</p>
        <p class="access-secondary">{{ editingStaff?.email }}</p>
        <p class="access-assignment-count">
          <ShieldCheck :size="17" />{{ selectedRoles.length }} roles · {{ effectiveCount }} effective permissions
        </p>
        <label v-for="role in roles" :key="role.id" class="access-checkbox access-assignment"
          ><input v-model="selectedRoles" type="checkbox" :value="role.name" :disabled="busy" /><span
            ><strong>{{ role.label }}</strong
            ><small>{{ role.description || `${role.permissions.length} permissions` }}</small></span
          ><span class="access-badge">{{ role.permissions.length }}</span></label
        >
        <p class="access-footnote">
          Removing every role removes access to business modules. Personal profile and security settings stay available.
        </p>
      </div></AppDrawer
    >
  </div>
</template>

<style scoped>
.access-page {
  max-width: 1200px;
  margin: 0 auto;
  min-width: 0;
  color: var(--text);
}
.access-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}
.access-heading__intro {
  display: flex;
  gap: 14px;
  align-items: center;
}
.access-heading__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--border);
  background: var(--surface-sunken);
  color: var(--navy);
  border-radius: 12px;
  flex-shrink: 0;
}
.access-heading h2 {
  font-size: 25px;
  font-weight: 600;
  letter-spacing: -0.6px;
  margin: 0 0 5px;
  text-transform: none;
  color: var(--heading);
}
.access-heading p {
  color: var(--muted);
  font-size: 13px;
  margin: 0;
}
.access-create {
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.access-overview {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 22px;
  color: var(--muted);
  font-size: 12px;
}
.access-overview strong {
  font-size: 16px;
  color: var(--heading);
  font-variant-numeric: tabular-nums;
}
.access-overview__note {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}
.access-panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}
.access-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  padding: 8px 18px 0;
}
.access-tabs {
  display: flex;
  gap: 6px;
  align-self: stretch;
}
.access-tabs :deep(button) {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 16px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  background: none;
  white-space: nowrap;
}
.access-tabs :deep(button[data-state='active']) {
  color: var(--heading);
  border-bottom-color: var(--crimson);
}
.access-search {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--muted);
  border: 1px solid var(--border);
  padding: 0 10px;
  border-radius: 7px;
  margin-bottom: 8px;
  min-width: 0;
}
.access-search input {
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text);
  height: 35px;
  width: 100%;
  min-width: 0;
  padding: 0;
  font-size: 12px;
}
.access-search input:focus {
  outline: none;
  box-shadow: none;
}
.access-search:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.access-table-wrap {
  overflow-x: auto;
}
.access-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
}
.access-table th {
  background: var(--surface-sunken);
  padding: 13px 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}
.access-table td {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.access-table tr:last-child td {
  border-bottom: 0;
}
.access-table strong {
  font-weight: 600;
  color: var(--heading);
}
.access-role-name,
.access-row-actions,
.access-role-tags {
  display: flex;
  gap: 8px;
  align-items: center;
}
.access-role-tags {
  flex-wrap: wrap;
}
.access-role-name {
  flex-wrap: wrap;
}
.access-secondary {
  color: var(--muted);
  font-size: 12px;
  margin: 5px 0 0;
  line-height: 1.6;
}
.access-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 7px;
  border: 1px solid var(--border);
  background: var(--surface-sunken);
  border-radius: 5px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.access-badge--approved {
  color: light-dark(#226845, #a2dcbb);
  background: light-dark(#eef8f2, #183428);
  border-color: light-dark(#d5eadd, #315342);
}
.access-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.access-row-actions {
  justify-content: flex-end;
  white-space: nowrap;
}
.access-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  padding: 8px 10px;
  min-height: 33px;
  cursor: pointer;
  white-space: nowrap;
}
.access-action:hover:not(:disabled) {
  background: var(--surface-sunken);
}
.access-action--danger {
  color: var(--crimson);
}
.access-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.access-footnote {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.8;
  margin: 0;
  padding: 15px 20px;
  border-top: 1px solid var(--border);
}
.access-empty {
  padding: 42px 20px !important;
  color: var(--muted);
  text-align: center;
  font-size: 12px;
}
.access-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  color: var(--muted);
  font-size: 12px;
  border-top: 1px solid var(--border);
}
.access-pagination > div {
  display: flex;
  gap: 6px;
}
.access-text-button {
  background: none;
  border: 0;
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 5px;
}
.access-success {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 15px;
  border: 1px solid light-dark(#c8e4d3, #315342);
  border-radius: 8px;
  background: light-dark(#f0faf4, #183428);
  color: light-dark(#226845, #a2dcbb);
  font-size: 12px;
  margin-bottom: 18px;
}
.access-loading {
  display: grid;
  gap: 12px;
}
.access-loading div {
  height: 74px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-sunken);
  animation: access-pulse 1.4s ease-in-out infinite;
}
@keyframes access-pulse {
  50% {
    opacity: 0.45;
  }
}
.access-editor {
  display: grid;
  gap: 22px;
}
.access-editor-fields {
  display: grid;
  gap: 16px;
}
.access-editor-fields label {
  display: grid;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--heading);
}
.access-editor-fields input,
.access-editor-fields textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 11px 12px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 13px;
}
.access-editor-fields small {
  color: var(--crimson);
}
.access-permission-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}
.access-permission-heading h3 {
  margin: 0 0 5px;
  font-size: 15px;
  color: var(--heading);
}
.access-permission-heading p {
  color: var(--muted);
  font-size: 12px;
  margin: 0;
}
.access-permission-group {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 22px;
}
.access-permission-group legend {
  color: var(--heading);
  font-size: 12px;
  font-weight: 600;
  padding: 0 6px;
}
.access-permission-group > button {
  grid-column: 1/-1;
  justify-self: end;
  margin-top: -8px;
}
.access-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  line-height: 1.6;
}
.access-checkbox input {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  accent-color: var(--crimson);
}
.access-checkbox small {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}
.access-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  background: var(--surface-sunken);
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}
.access-info svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.access-assignment-count {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}
.access-assignment {
  border: 1px solid var(--border);
  padding: 14px;
  border-radius: 8px;
}
.access-assignment > span:last-child {
  margin-left: auto;
}
.access-assignment:has(input:checked) {
  border-color: color-mix(in srgb, var(--crimson) 45%, var(--border));
  background: var(--crimson-soft);
}
@media (max-width: 800px) {
  .access-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding-bottom: 10px;
  }
  .access-toolbar .access-search {
    margin: 0;
  }
  .access-overview__note {
    width: 100%;
    margin-left: 0;
  }
  .access-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .access-create {
    margin-left: auto;
  }
  .access-table th,
  .access-table td {
    padding: 14px;
  }
}
@media (max-width: 480px) {
  .access-heading h2 {
    font-size: 22px;
  }
  .access-permission-group {
    grid-template-columns: 1fr;
  }
  .access-permission-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .access-tabs :deep(button) {
    padding: 12px 9px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .access-loading div {
    animation: none;
  }
}
</style>
