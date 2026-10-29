<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { ApiError } from '@/core/api/http'
import { formatDate } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { accessApi } from '@/modules/settings/access-api'
import type { AccessRole } from '@/modules/settings/access-types'
import StaffFormDrawer from '../components/StaffFormDrawer.vue'
import { staffApi } from '../api'
import type { StaffFilters, StaffUser } from '../types'

const auth = useAuth()
const filters = reactive<StaffFilters>({ search: '', status: '', role: '' })
const roles = ref<AccessRole[]>([])
const table = ref<{ reload: () => Promise<void> } | null>(null)
const notice = ref('')
const failure = ref('')

const formOpen = ref(false)
const editing = ref<StaffUser | null>(null)
const deleting = ref<StaffUser | null>(null)
const busy = ref(false)

const roleLabels = computed(() => new Map(roles.value.map((role) => [role.name, role.label])))
const columns: Column<StaffUser>[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email address' },
  { key: 'roles', label: 'Roles', value: (staff) => staff.roles.map((role) => roleLabels.value.get(role) ?? role).join(', ') },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Added', value: (staff) => formatDate(staff.created_at) },
]

const fetchPage = (page: number) => staffApi.list({ ...filters, page })

onMounted(async () => {
  try {
    roles.value = await accessApi.roles()
  } catch (error) {
    failure.value = error instanceof Error ? error.message : 'Failed to load roles.'
  }
})

function openForm(staff: StaffUser | null) {
  editing.value = staff
  formOpen.value = true
}

function saved(staff: StaffUser, created: boolean) {
  failure.value = ''
  notice.value = created ? `${staff.name} can now sign in with ${staff.email}.` : `${staff.name} updated.`
  table.value?.reload()
}

async function confirmDelete() {
  if (!deleting.value) return
  busy.value = true
  failure.value = ''
  try {
    await staffApi.remove(deleting.value.id)
    notice.value = `${deleting.value.name} deleted.`
    table.value?.reload()
  } catch (error) {
    notice.value = ''
    failure.value = (error instanceof ApiError ? error.errors.user?.[0] : undefined) ?? (error instanceof Error ? error.message : 'Failed to delete the staff member.')
  } finally {
    busy.value = false
    deleting.value = null
  }
}
</script>

<template>
  <div>
    <p v-if="notice" class="muted" role="status">{{ notice }}</p>
    <p v-if="failure" class="alert alert--error" role="alert">{{ failure }}</p>

    <ResourceTable ref="table" title="Staff" description="The people who sign in, their roles and whether they can access the system." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #actions>
        <button class="btn btn--primary" type="button" @click="openForm(null)">Add staff member</button>
      </template>
      <template #filters>
        <input v-model="filters.search" type="search" placeholder="Search name or email" aria-label="Search staff" />
        <select v-model="filters.status" aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select v-model="filters.role" aria-label="Role">
          <option value="">All roles</option>
          <option v-for="role in roles" :key="role.id" :value="role.name">{{ role.label }}</option>
        </select>
      </template>
      <template #cell-status="{ row }"><StatusBadge :status="row.approved_at !== null" /></template>
      <template #row-actions="{ row }">
        <button class="btn btn--small" type="button" @click="openForm(row)">Edit</button>
        <button v-if="row.id !== auth.user.value?.id" class="btn btn--small btn--danger" type="button" @click="deleting = row">Delete</button>
      </template>
    </ResourceTable>

    <StaffFormDrawer v-model:open="formOpen" :staff="editing" :roles="roles" :current-user-id="auth.user.value?.id" @saved="saved" />

    <div v-if="deleting" class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-staff-title">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <h3 id="delete-staff-title" class="mb-1 text-[15px] font-bold normal-case tracking-normal text-neutral-900 dark:text-white">Delete {{ deleting.name }}?</h3>
        <p class="mb-4 text-[13px] text-neutral-500">
          Their account is removed permanently and records they made no longer show who made them. To keep that history, edit them and switch off <strong>Active</strong> instead.
        </p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200" @click="deleting = null">Cancel</button>
          <button type="button" :disabled="busy" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" @click="confirmDelete">Delete staff member</button>
        </div>
      </div>
    </div>
  </div>
</template>
