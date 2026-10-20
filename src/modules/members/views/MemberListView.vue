<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, ChevronLeft, ChevronRight, Copy, MoonStar, Pencil, Plus, Search, Sun, Upload } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import type { PaginationMeta } from '@/core/api/types'
import { formatDate, formatEnum } from '@/core/utils/format'
import { membersApi } from '../api'
import MemberFormDrawer from '../components/MemberFormDrawer.vue'
import MemberImportDrawer from '../components/MemberImportDrawer.vue'
import type { Member, MemberFilters, MemberStatus } from '../types'
import { genderPill, memberInitials, relativeDate, statusPill } from '../utils'

const route = useRoute()
const router = useRouter()

const STATUS_FILTERS: (MemberStatus | '')[] = ['', 'active', 'pending', 'dormant', 'suspended', 'rejected']

const filters = reactive<Required<Pick<MemberFilters, 'search' | 'status' | 'member_type'>>>({ search: '', status: '', member_type: '' })
const members = ref<Member[]>([])
const meta = ref<PaginationMeta | null>(null)
const page = ref(1)
const loading = ref(true)
const error = ref('')
const busyId = ref<number | null>(null)

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const importOpen = ref(false)

const copiedId = ref<number | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const response = await membersApi.list({ ...filters, page: page.value })
    members.value = response.data
    meta.value = response.meta
  } catch {
    error.value = 'Failed to load members.'
  } finally {
    loading.value = false
  }
}

function reload(): void {
  page.value = 1
  void load()
}

watch(() => [filters.status, filters.member_type], reload)
watch(() => filters.search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 300)
})
watch(page, load)

function openForm(member: Member | null = null): void {
  editingId.value = member?.id ?? null
  formOpen.value = true
}

onMounted(load)

// The "New member" links point here with ?create=1.
watch(() => route.query.create, (create) => {
  if (!create) return
  openForm()
  void router.replace({ query: {} })
}, { immediate: true })
onBeforeUnmount(() => {
  clearTimeout(copyTimer)
  clearTimeout(searchTimer)
})

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
    const updated = member.status === 'active' ? await membersApi.markDormant(member.id) : await membersApi.activate(member.id)
    members.value = members.value.map((row) => (row.id === updated.id ? updated : row))
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to update the member.'
  } finally {
    busyId.value = null
  }
}

const th = 'px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-neutral-400'
const actionButton = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl font-black tracking-tight text-navy dark:text-white">Members list</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Manage all members.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          @click="importOpen = true"
        >
          <Upload class="h-4 w-4" />
          <span>Import Members</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy/90"
          @click="openForm()"
        >
          <Plus class="h-4 w-4" />
          <span>Add Member</span>
        </button>
      </div>
    </div>

    <p v-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
      {{ error }}
    </p>

    <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div class="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
        <div class="relative min-w-[14rem] flex-1">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            v-model="filters.search"
            type="search"
            aria-label="Search members"
            placeholder="Search name, code, phone, email or NIN…"
            class="w-full rounded-lg border border-neutral-200 bg-transparent py-2 pl-9 pr-3 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white"
          />
        </div>
        <select
          v-model="filters.member_type"
          aria-label="Member type"
          class="rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
        >
          <option value="">All member types</option>
          <option value="new_member">New members</option>
          <option value="existing_member">Existing members</option>
        </select>
        <div class="flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800" role="tablist" aria-label="Status">
          <button
            v-for="status in STATUS_FILTERS"
            :key="status || 'all'"
            type="button"
            role="tab"
            :aria-selected="filters.status === status"
            :class="[
              'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors',
              filters.status === status
                ? 'bg-white text-navy shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200',
            ]"
            @click="filters.status = status"
          >
            {{ status || 'all' }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-neutral-800">
              <th :class="th">Member</th>
              <th :class="th">National ID</th>
              <th :class="th">Phone</th>
              <th :class="th">Joined</th>
              <th :class="th">Gender</th>
              <th :class="th">Status</th>
              <th :class="[th, 'text-right']">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
            <template v-if="loading">
              <tr v-for="i in 6" :key="`skeleton-${i}`" class="animate-pulse">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="h-11 w-11 shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
                    <div class="space-y-2">
                      <div class="h-3.5 w-32 rounded bg-neutral-100 dark:bg-neutral-800" />
                      <div class="h-2.5 w-20 rounded bg-neutral-100 dark:bg-neutral-800" />
                    </div>
                  </div>
                </td>
                <td v-for="j in 6" :key="j" class="px-6 py-4"><div class="h-3.5 w-20 rounded bg-neutral-100 dark:bg-neutral-800" /></td>
              </tr>
            </template>
            <tr v-else-if="!members.length">
              <td colspan="7" class="px-6 py-20 text-center">
                <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">No members yet</p>
                <p class="mt-1 text-xs text-neutral-400">Members you add will appear here.</p>
              </td>
            </tr>
            <tr v-for="member in members" v-else :key="member.id" class="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
              <td class="px-6 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-navy/10 ring-1 ring-navy/10 dark:ring-white/10">
                    <img v-if="member.avatar_url" :src="member.avatar_url" :alt="member.name" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full items-center justify-center text-sm font-bold text-navy dark:text-white">
                      {{ memberInitials(member.name) }}
                    </div>
                  </div>
                  <div class="min-w-0">
                    <RouterLink
                      :to="{ name: 'members.show', params: { id: member.id } }"
                      class="block max-w-[16rem] truncate text-sm font-semibold text-neutral-900 transition-colors hover:text-brand dark:text-white"
                    >
                      {{ member.salutation ? `${member.salutation} ` : '' }}{{ member.name }}
                    </RouterLink>
                    <button
                      type="button"
                      title="Copy code"
                      class="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-neutral-400 transition-colors hover:text-brand"
                      @click="copyCode(member)"
                    >
                      {{ member.member_number }}
                      <Check v-if="copiedId === member.id" class="h-3 w-3 text-emerald-600" />
                      <Copy v-else class="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-3.5">
                <span v-if="member.national_id" class="font-mono text-xs text-neutral-600 dark:text-neutral-300">{{ member.national_id }}</span>
                <span v-else class="text-neutral-300">—</span>
              </td>
              <td class="whitespace-nowrap px-6 py-3.5 tabular-nums text-neutral-600 dark:text-neutral-300">{{ member.phone }}</td>
              <td class="whitespace-nowrap px-6 py-3.5">
                <div class="text-sm text-neutral-700 dark:text-neutral-200">{{ formatDate(member.joined_at) }}</div>
                <div v-if="relativeDate(member.joined_at)" class="text-[11px] text-neutral-400">{{ relativeDate(member.joined_at) }}</div>
              </td>
              <td class="px-6 py-3.5">
                <span
                  v-if="member.gender"
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset"
                  :class="genderPill(member.gender)"
                >
                  <span class="size-1.5 rounded-full bg-current opacity-70" />
                  {{ member.gender }}
                </span>
                <span v-else class="text-neutral-300">—</span>
              </td>
              <td class="px-6 py-3.5">
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset" :class="statusPill(member.status)">
                  {{ formatEnum(member.status) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-3.5 text-right">
                <div class="inline-flex items-center justify-end gap-2">
                  <button
                    v-if="member.status !== 'dormant'"
                    type="button"
                    :class="[actionButton, 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300']"
                    @click="openForm(member)"
                  >
                    <Pencil class="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    v-if="member.status === 'active'"
                    type="button"
                    :disabled="busyId === member.id"
                    :class="[actionButton, 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300']"
                    @click="toggleDormant(member)"
                  >
                    <MoonStar class="h-3.5 w-3.5" /> Dormant
                  </button>
                  <button
                    v-else-if="['dormant', 'suspended', 'inactive'].includes(member.status)"
                    type="button"
                    :disabled="busyId === member.id"
                    :class="[actionButton, 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300']"
                    @click="toggleDormant(member)"
                  >
                    <Sun class="h-3.5 w-3.5" /> Activate
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="meta && meta.last_page > 1" class="flex items-center justify-between border-t border-neutral-100 px-6 py-3 text-sm text-neutral-500 dark:border-neutral-800">
        <span>Showing {{ meta.from }}–{{ meta.to }} of {{ meta.total }}</span>
        <div class="flex items-center gap-2">
          <button type="button" aria-label="Previous page" :disabled="page <= 1" class="rounded-lg border border-neutral-200 p-1.5 disabled:opacity-40 dark:border-neutral-700" @click="page--">
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span>Page {{ meta.current_page }} of {{ meta.last_page }}</span>
          <button type="button" aria-label="Next page" :disabled="page >= meta.last_page" class="rounded-lg border border-neutral-200 p-1.5 disabled:opacity-40 dark:border-neutral-700" @click="page++">
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <MemberFormDrawer v-model:open="formOpen" :member-id="editingId" @saved="load" />
    <MemberImportDrawer v-model:open="importOpen" @imported="reload" />
  </div>
</template>
