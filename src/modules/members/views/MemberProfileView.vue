<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Clock, Pencil, RotateCcw, ShieldCheck, ShieldX, Trash2 } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { membersApi } from '../api'
import MemberFormDrawer from '../components/MemberFormDrawer.vue'
import type { Member, MemberTransaction } from '../types'
import { genderPill, memberInitials, statusPill } from '../utils'

const props = defineProps<{ id: string }>()
const router = useRouter()

type Tab = 'profile' | 'transactions' | 'savings' | 'shares' | 'loans'
const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'savings', label: 'Savings' },
  { key: 'shares', label: 'Shares' },
  { key: 'loans', label: 'Loans' },
]

const member = ref<Member | null>(null)
const transactions = ref<MemberTransaction[] | null>(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const uploading = ref(false)
const tab = ref<Tab>('profile')

const editOpen = ref(false)
const rejectOpen = ref(false)
const rejectionReason = ref('')
const deleteOpen = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

const memberId = computed(() => Number(props.id))

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  transactions.value = null
  try {
    member.value = await membersApi.show(memberId.value)
  } catch {
    error.value = 'Failed to load the member.'
  } finally {
    loading.value = false
  }
}

watch(memberId, load, { immediate: true })

watch(tab, async (current) => {
  if (current !== 'transactions' || transactions.value !== null) return
  try {
    transactions.value = await membersApi.transactions(memberId.value)
  } catch {
    error.value = 'Failed to load transactions.'
  }
})

const savingsTotal = computed(() =>
  (member.value?.savings_accounts ?? []).reduce((sum, account) => sum + Number(account.balance ?? 0), 0),
)
const sharesHeld = computed(() => (member.value?.share_accounts ?? []).reduce((sum, account) => sum + (account.shares_held ?? 0), 0))
const sharesValue = computed(() =>
  (member.value?.share_accounts ?? []).reduce((sum, account) => sum + Number(account.share_value ?? 0), 0),
)
const loanBalance = computed(() =>
  (member.value?.loans ?? []).reduce((sum, loan) => sum + Number(loan.outstanding_principal ?? 0), 0),
)

const age = computed(() => {
  const dob = member.value?.date_of_birth
  if (!dob) return '—'
  const birth = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) years--
  return String(years)
})

type Field = [label: string, value: string | null | undefined]

const profileGroups = computed((): { title: string; fields: Field[] }[] => {
  const m = member.value
  if (!m) return []
  return [
    {
      title: 'Personal Information',
      fields: [
        ['Full Name', [m.salutation, m.name].filter(Boolean).join(' ')],
        ['Member Code', m.member_number],
        ['Member Type', formatEnum(m.member_type)],
        ['Date of Birth', formatDate(m.date_of_birth)],
        ['Marital Status', formatEnum(m.marital_status)],
        ['Nationality', m.nationality],
        ['Address', m.address],
      ],
    },
    {
      title: 'Contact Information',
      fields: [
        ['Primary Contact', m.phone],
        ['Other Contact', m.other_contact],
        ['Mobile Money', m.mobile_money_number],
        ['Email', m.email],
        ['National ID (NIN)', m.national_id],
      ],
    },
    {
      title: 'Next of Kin',
      fields: [
        ['Name', m.next_of_kin],
        ['Contact', m.next_of_kin_contact],
      ],
    },
    {
      title: 'Membership',
      fields: [
        ['Status', formatEnum(m.status)],
        ['Shareholder', m.is_shareholder ? 'Yes' : 'No'],
        ['Registered By', m.registrar?.name],
        ['Approved By', m.approver ? `${m.approver.name} · ${formatDate(m.approved_at)}` : null],
        ['Joined', formatDate(m.joined_at)],
        ['Created', formatDate(m.created_at)],
      ],
    },
    {
      title: 'Onboarding',
      fields: [
        ['Initial Deposit', m.initial_deposit === null ? null : formatMoney(m.initial_deposit)],
        ['Opening Balance', m.opening_balance === null ? null : formatMoney(m.opening_balance)],
      ],
    },
  ]
})

async function run(action: () => Promise<Member>): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    const updated = await action()
    member.value = { ...member.value, ...updated }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'The action failed.'
  } finally {
    busy.value = false
  }
}

const approve = () => run(() => membersApi.approve(memberId.value))
const requeue = () => run(() => membersApi.requeue(memberId.value))
const toggleDormant = () =>
  run(() => (member.value?.status === 'active' ? membersApi.markDormant(memberId.value) : membersApi.activate(memberId.value)))

async function reject(): Promise<void> {
  await run(() => membersApi.reject(memberId.value, rejectionReason.value.trim() || null))
  rejectOpen.value = false
  rejectionReason.value = ''
}

async function uploadAvatar(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const updated = await membersApi.uploadAvatar(memberId.value, file)
    if (member.value) member.value.avatar_url = updated.avatar_url
  } catch (e) {
    error.value = e instanceof ApiError ? (e.errors.avatar?.[0] ?? e.message) : 'Failed to upload the photo.'
  } finally {
    uploading.value = false
  }
}

async function destroy(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    await membersApi.remove(memberId.value)
    await router.push({ name: 'members.index' })
  } catch (e) {
    error.value = e instanceof ApiError && e.status === 409
      ? 'This member has accounts or loans, so they cannot be deleted. Mark them dormant instead.'
      : 'Failed to delete the member.'
    deleteOpen.value = false
  } finally {
    busy.value = false
  }
}

const card = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
const th = 'px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-neutral-400'
const td = 'whitespace-nowrap px-5 py-3 text-neutral-700 dark:text-neutral-200'
const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset'
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink :to="{ name: 'members.index' }" aria-label="Back to members" class="rounded-full p-2 transition hover:bg-neutral-200 dark:hover:bg-neutral-800">
        <ChevronLeft class="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
      </RouterLink>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Member Profile</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Details, accounts and activity.</p>
      </div>
      <template v-if="member">
        <button
          v-if="member.status === 'active' || ['dormant', 'suspended', 'inactive'].includes(member.status)"
          type="button"
          :disabled="busy"
          class="rounded-full border border-neutral-200 bg-white px-4 py-2 text-[13px] font-bold text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          @click="toggleDormant"
        >
          {{ member.status === 'active' ? 'Mark Dormant' : 'Activate' }}
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-navy/90"
          @click="editOpen = true"
        >
          <Pencil class="h-4 w-4" /> Edit
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          @click="deleteOpen = true"
        >
          <Trash2 class="h-4 w-4" /> Delete
        </button>
      </template>
    </div>

    <p v-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
      {{ error }}
    </p>

    <div v-if="loading" class="flex items-center justify-center gap-3 py-24 text-sm text-neutral-500">
      <span class="inline-block h-6 w-6 animate-spin rounded-full border-4 border-brand border-r-transparent" aria-hidden="true" />
      Loading member...
    </div>

    <template v-else-if="member">
      <!-- Approval banners -->
      <div v-if="member.status === 'pending'" class="flex flex-wrap items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <Clock class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-bold text-amber-800 dark:text-amber-300">Awaiting Approval</p>
          <p class="mt-0.5 text-[12px] text-amber-700 dark:text-amber-200">This member is pending approval. Approve the registration to make the member active.</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button type="button" :disabled="busy" class="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-[12px] font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50" @click="rejectOpen = true">
            <ShieldX class="h-3.5 w-3.5" /> Reject
          </button>
          <button type="button" :disabled="busy" class="flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50" @click="approve">
            <ShieldCheck class="h-3.5 w-3.5" /> {{ busy ? 'Working…' : 'Approve Member' }}
          </button>
        </div>
      </div>

      <div v-if="member.status === 'rejected'" class="flex flex-wrap items-start gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/30 dark:bg-red-500/10">
        <ShieldX class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-bold text-red-800 dark:text-red-300">Registration Rejected</p>
          <p class="mt-0.5 text-[12px] text-red-700 dark:text-red-200">
            {{ member.rejection_reason || 'No reason was given.' }}
            <span v-if="member.rejecter"> — {{ member.rejecter.name }}, {{ formatDate(member.rejected_at) }}</span>
          </p>
        </div>
        <button type="button" :disabled="busy" class="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-[12px] font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50" @click="requeue">
          <RotateCcw class="h-3.5 w-3.5" /> Send back for approval
        </button>
      </div>

      <div class="flex flex-col gap-6 lg:flex-row">
        <!-- Sidebar -->
        <aside class="flex w-full shrink-0 flex-col gap-6 lg:w-[280px]">
          <div :class="[card, 'overflow-hidden']">
            <div class="h-[88px] bg-navy" />
            <div class="relative z-10 -mt-12 flex justify-center px-4">
              <button
                type="button"
                title="Change photo"
                class="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-brand bg-white shadow-sm dark:bg-neutral-900"
                @click="avatarInput?.click()"
              >
                <img v-if="member.avatar_url" :src="member.avatar_url" :alt="member.name" class="h-full w-full object-cover" />
                <span v-else class="text-2xl font-bold text-brand">{{ memberInitials(member.name) }}</span>
                <span v-if="uploading" class="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span class="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                </span>
              </button>
              <input ref="avatarInput" type="file" accept="image/*" class="sr-only" @change="uploadAvatar" />
            </div>
            <div class="mb-5 px-5 pt-3 text-center">
              <h2 class="text-[17px] font-black tracking-tight text-neutral-900 dark:text-white">{{ member.name }}</h2>
              <p class="mt-1 text-[13px] text-neutral-500">ID · {{ member.member_number }}</p>
              <p class="mt-0.5 text-[13px] text-neutral-500">{{ member.email || '—' }}</p>
              <span :class="[pill, 'mt-4 uppercase tracking-wider', statusPill(member.status)]">{{ formatEnum(member.status) }}</span>
            </div>
            <div class="mx-5 mb-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <div class="border-b border-r border-neutral-100 p-4 dark:border-neutral-800">
                <span class="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">Shares</span>
                <span class="text-[17px] font-extrabold text-neutral-900 dark:text-white">{{ sharesHeld }}</span>
              </div>
              <div class="border-b border-neutral-100 p-4 dark:border-neutral-800">
                <span class="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">Gender</span>
                <span :class="[pill, 'capitalize', genderPill(member.gender)]">{{ member.gender || '—' }}</span>
              </div>
              <div class="border-r border-neutral-100 p-4 dark:border-neutral-800">
                <span class="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">Marital</span>
                <span class="text-[15px] font-bold capitalize text-neutral-900 dark:text-white">{{ member.marital_status || '—' }}</span>
              </div>
              <div class="p-4">
                <span class="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">Age</span>
                <span class="text-[15px] font-bold text-neutral-900 dark:text-white">{{ age }}</span>
              </div>
            </div>
          </div>

          <div :class="[card, 'p-6']">
            <h3 class="mb-5 text-[12px] font-bold uppercase tracking-wider text-neutral-500">Quick Info</h3>
            <dl class="space-y-4 text-[13px]">
              <div class="flex justify-between gap-3"><dt class="text-neutral-500">Phone</dt><dd class="font-mono text-neutral-700 dark:text-neutral-200">{{ member.phone }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-neutral-500">NIN</dt><dd class="font-mono text-neutral-700 dark:text-neutral-200">{{ member.national_id || '—' }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-neutral-500">Type</dt><dd class="text-neutral-700 dark:text-neutral-200">{{ formatEnum(member.member_type) }}</dd></div>
              <div class="flex justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800"><dt class="text-neutral-500">Joined</dt><dd class="text-neutral-700 dark:text-neutral-200">{{ formatDate(member.joined_at) }}</dd></div>
            </dl>
          </div>
        </aside>

        <!-- Main -->
        <section class="flex min-w-0 flex-1 flex-col gap-6">
          <div class="grid gap-4 sm:grid-cols-3">
            <div :class="[card, 'p-5']">
              <p class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Savings balance</p>
              <p class="mt-2 text-xl font-extrabold text-navy dark:text-white">{{ formatMoney(savingsTotal) }}</p>
              <p class="mt-1 text-xs text-neutral-400">{{ member.savings_accounts?.length ?? 0 }} account(s)</p>
            </div>
            <div :class="[card, 'p-5']">
              <p class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Share value</p>
              <p class="mt-2 text-xl font-extrabold text-navy dark:text-white">{{ formatMoney(sharesValue) }}</p>
              <p class="mt-1 text-xs text-neutral-400">{{ sharesHeld }} share(s)</p>
            </div>
            <div :class="[card, 'p-5']">
              <p class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Loan balance</p>
              <p class="mt-2 text-xl font-extrabold text-brand">{{ formatMoney(loanBalance) }}</p>
              <p class="mt-1 text-xs text-neutral-400">{{ member.loans?.length ?? 0 }} loan(s)</p>
            </div>
          </div>

          <div :class="card">
            <div class="flex gap-1 overflow-x-auto border-b border-neutral-100 px-4 dark:border-neutral-800" role="tablist">
              <button
                v-for="item in TABS"
                :key="item.key"
                type="button"
                role="tab"
                :aria-selected="tab === item.key"
                :class="[
                  '-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                  tab === item.key ? 'border-brand text-brand' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200',
                ]"
                @click="tab = item.key"
              >
                {{ item.label }}
              </button>
            </div>

            <!-- Profile -->
            <div v-if="tab === 'profile'" class="grid gap-6 p-6 md:grid-cols-2">
              <div v-for="group in profileGroups" :key="group.title">
                <h3 class="mb-3 text-[12px] font-bold uppercase tracking-wider text-neutral-500">{{ group.title }}</h3>
                <dl class="divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                  <div v-for="[label, value] in group.fields" :key="label" class="flex justify-between gap-4 px-4 py-2.5 text-[13px]">
                    <dt class="text-neutral-500">{{ label }}</dt>
                    <dd class="text-right font-medium text-neutral-800 dark:text-neutral-100">{{ value || '—' }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Transactions -->
            <div v-else-if="tab === 'transactions'" class="overflow-x-auto">
              <p v-if="transactions === null" class="px-6 py-10 text-center text-sm text-neutral-500">Loading transactions...</p>
              <p v-else-if="!transactions.length" class="px-6 py-10 text-center text-sm text-neutral-500">No transactions yet.</p>
              <table v-else class="w-full text-left text-sm">
                <thead><tr class="border-b border-neutral-100 dark:border-neutral-800">
                  <th :class="th">Date</th><th :class="th">Source</th><th :class="th">Type</th><th :class="th">Account</th><th :class="th">Reference</th><th :class="[th, 'text-right']">Amount</th>
                </tr></thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="row in transactions" :key="`${row.source}-${row.id}`">
                    <td :class="td">{{ formatDate(row.date) }}</td>
                    <td :class="[td, 'capitalize']">{{ row.source }}</td>
                    <td :class="td">{{ formatEnum(row.type) }}</td>
                    <td :class="[td, 'font-mono text-xs']">{{ row.account }}</td>
                    <td :class="td">{{ row.reference || '—' }}</td>
                    <td :class="[td, 'text-right tabular-nums']">{{ formatMoney(row.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Savings -->
            <div v-else-if="tab === 'savings'" class="overflow-x-auto">
              <p v-if="!member.savings_accounts?.length" class="px-6 py-10 text-center text-sm text-neutral-500">No savings accounts.</p>
              <table v-else class="w-full text-left text-sm">
                <thead><tr class="border-b border-neutral-100 dark:border-neutral-800">
                  <th :class="th">Account</th><th :class="th">Product</th><th :class="th">Status</th><th :class="th">Opened</th><th :class="[th, 'text-right']">Balance</th>
                </tr></thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="account in member.savings_accounts" :key="account.id">
                    <td :class="[td, 'font-mono text-xs']">{{ account.account_number }}</td>
                    <td :class="td">{{ account.product?.name ?? '—' }}</td>
                    <td :class="td">{{ formatEnum(account.status) }}</td>
                    <td :class="td">{{ formatDate(account.opened_at) }}</td>
                    <td :class="[td, 'text-right tabular-nums']">{{ formatMoney(account.balance) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Shares -->
            <div v-else-if="tab === 'shares'" class="overflow-x-auto">
              <p v-if="!member.share_accounts?.length" class="px-6 py-10 text-center text-sm text-neutral-500">No share accounts.</p>
              <table v-else class="w-full text-left text-sm">
                <thead><tr class="border-b border-neutral-100 dark:border-neutral-800">
                  <th :class="th">Account</th><th :class="th">Product</th><th :class="th">Status</th><th :class="th">Shares</th><th :class="[th, 'text-right']">Value</th>
                </tr></thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="account in member.share_accounts" :key="account.id">
                    <td :class="[td, 'font-mono text-xs']">{{ account.account_number }}</td>
                    <td :class="td">{{ account.product?.name ?? '—' }}</td>
                    <td :class="td">{{ formatEnum(account.status) }}</td>
                    <td :class="[td, 'tabular-nums']">{{ account.shares_held ?? '—' }}</td>
                    <td :class="[td, 'text-right tabular-nums']">{{ formatMoney(account.share_value) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Loans -->
            <div v-else class="overflow-x-auto">
              <p v-if="!member.loans?.length" class="px-6 py-10 text-center text-sm text-neutral-500">No loans.</p>
              <table v-else class="w-full text-left text-sm">
                <thead><tr class="border-b border-neutral-100 dark:border-neutral-800">
                  <th :class="th">Loan</th><th :class="th">Product</th><th :class="th">Status</th><th :class="th">Principal</th><th :class="[th, 'text-right']">Outstanding</th>
                </tr></thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="loan in member.loans" :key="loan.id">
                    <td :class="[td, 'font-mono text-xs']">{{ loan.loan_number }}</td>
                    <td :class="td">{{ loan.product?.name ?? '—' }}</td>
                    <td :class="td">{{ formatEnum(loan.status) }}</td>
                    <td :class="[td, 'tabular-nums']">{{ formatMoney(loan.principal) }}</td>
                    <td :class="[td, 'text-right tabular-nums']">{{ formatMoney(loan.outstanding_principal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- Reject dialog -->
    <div v-if="rejectOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reject-title">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <h3 id="reject-title" class="mb-1 text-[15px] font-bold text-neutral-900 dark:text-white">Reject Registration</h3>
        <p class="mb-4 text-[12px] text-neutral-500">Optionally give a reason. It is saved with the member's record.</p>
        <textarea v-model="rejectionReason" rows="3" aria-label="Rejection reason" class="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700 dark:text-white" placeholder="e.g. Missing ID copy" />
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" :disabled="busy" class="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200" @click="rejectOpen = false">Cancel</button>
          <button type="button" :disabled="busy" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="reject">Reject</button>
        </div>
      </div>
    </div>

    <!-- Delete dialog -->
    <div v-if="deleteOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <h3 id="delete-title" class="mb-1 text-[15px] font-bold text-neutral-900 dark:text-white">Delete {{ member?.name }}?</h3>
        <p class="mb-4 text-[12px] text-neutral-500">This permanently removes the member. Members with accounts or loans cannot be deleted.</p>
        <div class="flex justify-end gap-2">
          <button type="button" :disabled="busy" class="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200" @click="deleteOpen = false">Cancel</button>
          <button type="button" :disabled="busy" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="destroy">Delete</button>
        </div>
      </div>
    </div>

    <MemberFormDrawer v-model:open="editOpen" :member-id="member?.id ?? null" @saved="load" />
  </div>
</template>
