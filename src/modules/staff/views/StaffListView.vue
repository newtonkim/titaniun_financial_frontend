<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
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
  { key: 'name', label: 'Name', sortable: true, tone: 'strong' },
  { key: 'email', label: 'Email address', sortable: true, tone: 'muted' },
  { key: 'roles', label: 'Roles', value: (staff) => staff.roles.map((role) => roleLabels.value.get(role) ?? role).join(', ') },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Added', sortable: true, value: (staff) => formatDate(staff.created_at) },
]

const fetchPage = (params: PageParams) => staffApi.list({ ...filters, ...params })

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
    <ResourceTable ref="table" title="Staff" description="The people who sign in, their roles and whether they can access the system." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #actions>
        <Button size="sm" @click="openForm(null)"><Plus /> Add staff member</Button>
      </template>
      <template #messages>
        <p v-if="failure" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ failure }}</p>
        <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>
      </template>
      <template #filters>
        <div class="relative min-w-52 flex-1 lg:max-w-72">
          <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="filters.search" type="search" placeholder="Search name or email" aria-label="Search staff" class="h-8 pl-8 text-sm" />
        </div>
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
        <Button variant="outline" size="xs" @click="openForm(row)">Edit</Button>
        <Button v-if="row.id !== auth.user.value?.id" variant="outline" size="xs" class="text-destructive hover:text-destructive" @click="deleting = row">Delete</Button>
      </template>
    </ResourceTable>

    <StaffFormDrawer v-model:open="formOpen" :staff="editing" :roles="roles" :current-user-id="auth.user.value?.id" @saved="saved" />

    <div v-if="deleting" class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-staff-title">
      <div class="w-full max-w-md rounded-lg bg-background p-6 shadow-2xl">
        <h3 id="delete-staff-title" class="mb-1 text-subsection text-heading">Delete {{ deleting.name }}?</h3>
        <p class="mb-4 text-[13px] text-muted-foreground">
          Their account is removed permanently and records they made no longer show who made them. To keep that history, edit them and switch off <strong>Active</strong> instead.
        </p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200" @click="deleting = null">Cancel</button>
          <button type="button" :disabled="busy" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" @click="confirmDelete">Delete staff member</button>
        </div>
      </div>
    </div>
  </div>
</template>
