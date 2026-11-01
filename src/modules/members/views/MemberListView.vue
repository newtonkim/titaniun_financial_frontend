<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Copy, Plus, Search, Upload } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { formatDate, formatEnum } from '@/core/utils/format'
import { membersApi } from '../api'
import MemberFormDrawer from '../components/MemberFormDrawer.vue'
import MemberImportDrawer from '../components/MemberImportDrawer.vue'
import type { Member, MemberFilters, MemberStatus } from '../types'
import { memberInitials } from '../utils'

const route = useRoute()
const router = useRouter()

const STATUSES: { label: string; value: MemberStatus | '' }[] = [
  { label: 'All', value: '' },
  ...(['active', 'pending', 'dormant', 'suspended', 'rejected'] as const).map((value) => ({ label: formatEnum(value), value })),
]

const filters = reactive<Required<Pick<MemberFilters, 'search' | 'status' | 'member_type'>>>({ search: '', status: '', member_type: '' })
const table = ref<{ reload: () => Promise<void>; load: (page: number) => Promise<void> } | null>(null)
const error = ref('')
const busyId = ref<number | null>(null)

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const importOpen = ref(false)

const copiedId = ref<number | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined

const columns: Column<Member>[] = [
  { key: 'member', label: 'Member', sortable: true },
  { key: 'member_number', label: 'Code', sortable: true },
  { key: 'national_id', label: 'National ID', tone: 'muted', sortable: true },
  { key: 'phone', label: 'Phone', sortable: true },
  { key: 'joined_at', label: 'Joined', sortable: true, value: (member) => formatDate(member.joined_at) },
  { key: 'gender', label: 'Gender', tone: 'muted', sortable: true, value: (member) => (member.gender ? formatEnum(member.gender) : null) },
  { key: 'status', label: 'Status', sortable: true },
]

const fetchPage = (params: PageParams) => membersApi.list({ ...filters, ...params })

function openForm(member: Member | null = null): void {
  editingId.value = member?.id ?? null
  formOpen.value = true
}

// The "New member" links point here with ?create=1.
watch(() => route.query.create, (create) => {
  if (!create) return
  openForm()
  void router.replace({ query: {} })
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(copyTimer))

async function copyCode(member: Member): Promise<void> {
  await navigator.clipboard?.writeText(member.member_number)
  copiedId.value = member.id
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copiedId.value = null), 1500)
}

async function toggleDormant(member: Member): Promise<void> {
  busyId.value = member.id
  error.value = ''
  try {
    await (member.status === 'active' ? membersApi.markDormant(member.id) : membersApi.activate(member.id))
    await table.value?.reload()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to update the member.'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <ResourceTable ref="table" title="Members" description="Everyone registered with the SACCO, and their status." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #actions>
        <Button variant="outline" size="sm" @click="importOpen = true"><Upload /> Import members</Button>
        <Button size="sm" @click="openForm()"><Plus /> Add member</Button>
      </template>

      <template #messages>
        <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
      </template>

      <template #filters>
        <div class="relative min-w-52 flex-1 lg:max-w-72">
          <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="filters.search" type="search" aria-label="Search members" placeholder="Name, code, phone or NIN" class="h-8 pl-8 text-sm" />
        </div>
        <select v-model="filters.member_type" aria-label="Member type">
          <option value="">All member types</option>
          <option value="new_member">New members</option>
          <option value="existing_member">Existing members</option>
        </select>
        <SegmentedControl v-model="filters.status" :options="STATUSES" label="Status" />
      </template>

      <template #cell-member="{ row }">
        <div class="flex items-center gap-2">
          <span class="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy/10 text-xs font-bold text-navy dark:bg-white/10 dark:text-white">
            <img v-if="row.avatar_url" :src="row.avatar_url" :alt="row.name" class="size-full object-cover" />
            <template v-else>{{ memberInitials(row.name) }}</template>
          </span>
          <RouterLink :to="{ name: 'members.show', params: { id: row.id } }" class="block max-w-[16rem] truncate font-semibold text-navy underline-offset-2 hover:underline dark:text-white">
            {{ row.salutation ? `${row.salutation} ` : '' }}{{ row.name }}
          </RouterLink>
        </div>
      </template>

      <template #cell-member_number="{ row }">
        <button type="button" title="Copy code" class="group inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground" @click="copyCode(row)">
          {{ row.member_number }}
          <Check v-if="copiedId === row.id" class="size-3 text-success" />
          <Copy v-else class="size-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
      </template>

      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>

      <template #row-actions="{ row }">
        <Button v-if="row.status !== 'dormant'" variant="outline" size="xs" @click="openForm(row)">Edit</Button>
        <Button v-if="row.status === 'active'" variant="outline" size="xs" :disabled="busyId === row.id" @click="toggleDormant(row)">Make dormant</Button>
        <Button v-else-if="['dormant', 'suspended', 'inactive'].includes(row.status)" variant="outline" size="xs" :disabled="busyId === row.id" @click="toggleDormant(row)">Activate</Button>
      </template>

      <template #empty>
        <p class="font-medium">No members yet</p>
        <p class="mt-1 text-muted-foreground">Members you add will appear here.</p>
        <Button size="sm" class="mt-3" @click="openForm()"><Plus /> Add member</Button>
      </template>
    </ResourceTable>

    <MemberFormDrawer v-model:open="formOpen" :member-id="editingId" @saved="table?.reload()" />
    <MemberImportDrawer v-model:open="importOpen" @imported="table?.load(1)" />
  </div>
</template>
