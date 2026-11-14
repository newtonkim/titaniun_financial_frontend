<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import {
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Hash,
  Heart,
  Mail,
  MapPin,
  MinusCircle,
  Phone,
  LogOut,
  Printer,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Star,
  TrendingUp,
  User,
  UserCircle2,
  Users,
  Wallet,
} from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import MemberExitPanel from '../components/MemberExitPanel.vue'
import OpenSavingsAccountDrawer from '@/modules/savings/components/OpenSavingsAccountDrawer.vue'
import SavingsTransactionDrawer from '@/modules/savings/components/SavingsTransactionDrawer.vue'
import { savingsReversalsApi, savingsTransactionsApi } from '@/modules/savings/api'
import { openSavingsReceipt } from '@/modules/savings/receipt-pdf'
import type { SavingsAccount, SavingsReversal } from '@/modules/savings/types'
import { membersApi } from '../api'
import CustomFeeDrawer from '../components/CustomFeeDrawer.vue'
import MemberAccountsTable from '../components/MemberAccountsTable.vue'
import MemberLedger from '../components/MemberLedger.vue'
import MemberStatement from '../components/MemberStatement.vue'
import PendingReversalsPanel from '../components/PendingReversalsPanel.vue'
import type { Member, MemberBalances, MemberStatus, MemberTransaction } from '../types'
import { genderPill, memberInitials } from '../utils'

const props = defineProps<{ id: string }>()
const { can, user } = useAuth()

type Tab = 'profile' | 'transactions' | 'savings' | 'withdrawal' | 'loans' | 'shares' | 'statement' | 'exit'

const CURRENCY = 'UGX'
const member = ref<Member | null>(null)
const transactions = ref<MemberTransaction[]>([])
const balances = ref<MemberBalances | null>(null)
const reversals = ref<SavingsReversal[]>([])
const printing = ref<number | null>(null)
const reversing = ref<MemberTransaction | null>(null)
const reversalReason = ref('')
const feeAccount = ref<SavingsAccount | null>(null)
const feeOpen = ref(false)
const statusChange = ref<MemberStatus | null>(null)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const busy = ref(false)
const uploading = ref(false)
const tab = ref<Tab>('profile')
const copied = ref<string | null>(null)

const transactionType = ref<'deposit' | 'withdrawal'>('deposit')
const transactionAccount = ref<SavingsAccount | null>(null)
const transactionOpen = ref(false)
const openAccountOpen = ref(false)
const rejectOpen = ref(false)
const rejectionReason = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarBroken = ref(false)

const memberId = computed(() => Number(props.id))

/** Loads the member and their ledger; `quiet` refreshes without the loading screen, after a transaction. */
async function load(quiet = false): Promise<void> {
  if (!quiet) loading.value = true
  error.value = ''
  try {
    const [loaded, ledger, pending] = await Promise.all([
      membersApi.show(memberId.value),
      membersApi.transactions(memberId.value),
      savingsReversalsApi.list({ status: 'pending', member_id: memberId.value }),
    ])
    member.value = loaded
    transactions.value = ledger.data
    balances.value = ledger.summary
    reversals.value = pending
  } catch {
    error.value = 'Failed to load the member.'
  } finally {
    loading.value = false
  }
}

watch(memberId, () => load(), { immediate: true })

const tabs = computed((): { id: Tab; label: string; icon: Component; count: number | null }[] => [
  { id: 'profile', label: 'Member Profile', icon: UserCircle2, count: null },
  { id: 'transactions', label: 'Member Transactions', icon: FileText, count: transactions.value.length },
  { id: 'savings', label: 'Member Savings', icon: TrendingUp, count: transactions.value.filter((txn) => txn.source === 'savings' && txn.type === 'deposit').length },
  { id: 'withdrawal', label: 'Member Withdrawal', icon: MinusCircle, count: transactions.value.filter((txn) => txn.source === 'savings' && txn.type === 'withdrawal').length },
  { id: 'loans', label: 'Member Loans', icon: Wallet, count: member.value?.loans?.length ?? 0 },
  { id: 'shares', label: 'Member Shares', icon: BarChart3, count: transactions.value.filter((txn) => txn.source === 'shares').length },
  { id: 'statement', label: 'Member Statement', icon: Printer, count: null },
  { id: 'exit', label: 'Member Exit', icon: LogOut, count: null },
])

const sharesHeld = computed(() => (member.value?.share_accounts ?? []).reduce((sum, account) => sum + (account.shares_held ?? 0), 0))
const canTransact = computed(() => member.value?.status === 'active' && can('savings.manage'))

const age = computed(() => {
  const dob = member.value?.date_of_birth
  if (!dob) return '—'
  const birth = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) years--
  return String(years)
})

const quickInfo = computed(() => {
  const m = member.value
  if (!m) return []
  return [
    { label: 'Date of Birth', value: formatDate(m.date_of_birth) },
    { label: 'National ID', value: m.national_id || '—' },
    { label: 'Date Joined', value: formatDate(m.joined_at ?? m.created_at) },
    { label: 'Mobile Money', value: m.mobile_money_number || '—' },
    { label: 'Nationality', value: m.nationality || '—' },
    { label: 'Referred By', value: m.referrer?.name || '—', border: true },
    { label: 'Registered By', value: m.registrar?.name || '—' },
  ]
})

type FieldType = 'text' | 'badge' | 'copy' | 'currency'
interface ProfileField { label: string; icon: Component; value: string | null | undefined; type?: FieldType }

const profileSections = computed((): { title: string; icon: Component; fields: ProfileField[] }[] => {
  const m = member.value
  if (!m) return []
  return [
    {
      title: 'Personal Information',
      icon: User,
      fields: [
        { label: 'Full Name', icon: User, value: [m.salutation, m.name].filter(Boolean).join(' ') },
        { label: 'Member Code', icon: Hash, value: m.member_number, type: 'copy' },
        { label: 'Email Address', icon: Mail, value: m.email },
        { label: 'Date of Birth', icon: Calendar, value: m.date_of_birth ? formatDate(m.date_of_birth) : null },
        { label: 'Marital Status', icon: Heart, value: m.marital_status ? formatEnum(m.marital_status) : null, type: 'badge' },
        { label: 'Nationality', icon: MapPin, value: m.nationality },
        { label: 'Address', icon: MapPin, value: m.address },
      ],
    },
    {
      title: 'Contact Information',
      icon: Phone,
      fields: [
        { label: 'Primary Contact', icon: Phone, value: m.phone },
        { label: 'Other Contact', icon: Phone, value: m.other_contact },
        { label: 'Mobile Money', icon: Smartphone, value: m.mobile_money_number },
        { label: 'National ID (NIN)', icon: CreditCard, value: m.national_id },
      ],
    },
    {
      title: 'Next of Kin',
      icon: Users,
      fields: [
        { label: 'Next of Kin', icon: User, value: m.next_of_kin },
        { label: 'Next Contact', icon: Phone, value: m.next_of_kin_contact },
      ],
    },
    {
      title: 'Membership',
      icon: ShieldCheck,
      fields: [
        { label: 'Status', icon: ShieldCheck, value: formatEnum(m.status), type: 'badge' },
        { label: 'Referred By', icon: User, value: m.referrer?.name },
        { label: 'Registered By', icon: User, value: m.registrar?.name },
        { label: 'Joined Date', icon: Calendar, value: m.joined_at ? formatDate(m.joined_at) : null },
        { label: 'Created At', icon: Calendar, value: m.created_at ? formatDate(m.created_at) : null },
      ],
    },
    {
      title: 'Financial',
      icon: Wallet,
      fields: [
        { label: 'Initial Deposit', icon: Wallet, value: m.initial_deposit, type: 'currency' },
        { label: 'Opening Balance', icon: Wallet, value: m.opening_balance, type: 'currency' },
      ],
    },
  ]
})

function badgeClass(value: string): string {
  const v = value.toLowerCase()
  if (['active', 'married', 'approved'].includes(v)) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (['single'].includes(v)) return 'bg-teal-50 text-teal-700 ring-teal-600/20'
  if (['inactive', 'suspended', 'dormant', 'rejected', 'exited'].includes(v)) return 'bg-rose-50 text-rose-700 ring-rose-600/20'
  if (['pending'].includes(v)) return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-neutral-100 text-neutral-600 ring-neutral-500/20'
}

function copy(value: string | null | undefined): void {
  if (!value) return
  void navigator.clipboard?.writeText(value).then(() => {
    copied.value = value
    setTimeout(() => (copied.value = null), 1500)
  })
}

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

async function reject(): Promise<void> {
  await run(() => membersApi.reject(memberId.value, rejectionReason.value.trim() || null))
  rejectOpen.value = false
  rejectionReason.value = ''
}

function startTransaction(type: 'deposit' | 'withdrawal', account: SavingsAccount): void {
  transactionType.value = type
  transactionAccount.value = account
  notice.value = ''
  transactionOpen.value = true
}

async function savingsChanged(message: string): Promise<void> {
  notice.value = message
  error.value = ''
  await load(true)
}

async function printReceipt(txn: MemberTransaction): Promise<void> {
  printing.value = txn.id
  error.value = ''
  try {
    openSavingsReceipt(await savingsTransactionsApi.receipt(txn.id))
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load the receipt.'
  } finally {
    printing.value = null
  }
}

function startReversal(txn: MemberTransaction): void {
  if (!txn.is_reversible) return
  reversing.value = txn
  reversalReason.value = ''
}

async function requestReversal(): Promise<void> {
  const txn = reversing.value
  if (!txn) return
  busy.value = true
  error.value = ''
  try {
    const reversal = await savingsTransactionsApi.requestReversal(txn.id, reversalReason.value.trim())
    reversing.value = null
    await savingsChanged(reversal.status === 'approved' ? `Transaction #${txn.id} reversed.` : `Reversal of transaction #${txn.id} requested. Someone else with approval rights must approve it.`)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'The reversal could not be requested.'
  } finally {
    busy.value = false
  }
}

function openCustomFee(account: SavingsAccount): void {
  feeAccount.value = account
  feeOpen.value = true
}

/** The statuses a member can move to from their current one, through the approval and dormancy actions. */
const statusOptions = computed((): { value: MemberStatus; label: string }[] => {
  const status = member.value?.status
  const current = status ? [{ value: status, label: formatEnum(status) }] : []
  if (status === 'pending') return [...current, { value: 'active', label: 'Active (approve)' }, { value: 'rejected', label: 'Rejected' }]
  if (status === 'rejected') return [...current, { value: 'pending', label: 'Pending (send back for approval)' }]
  if (status === 'active') return [...current, { value: 'dormant', label: 'Dormant' }]
  if (status && ['dormant', 'suspended', 'inactive'].includes(status)) return [...current, { value: 'active', label: 'Active' }]
  return current
})
const canChangeStatus = computed(() => can('members.approve') || can('members.manage'))

function chooseStatus(event: Event): void {
  const select = event.target as HTMLSelectElement
  const next = select.value as MemberStatus
  select.value = member.value?.status ?? ''
  if (next === member.value?.status) return
  if (next === 'rejected') {
    rejectOpen.value = true
    return
  }
  statusChange.value = next
}

async function confirmStatusChange(): Promise<void> {
  const next = statusChange.value
  const current = member.value?.status
  statusChange.value = null
  if (!next || !current) return
  if (next === 'active') await run(() => (current === 'pending' ? membersApi.approve(memberId.value) : membersApi.activate(memberId.value)))
  else if (next === 'dormant') await run(() => membersApi.markDormant(memberId.value))
  else if (next === 'pending') await run(() => membersApi.requeue(memberId.value))
}

async function uploadAvatar(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Clear the picker so choosing the same file again still fires a change.
  input.value = ''
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const updated = await membersApi.uploadAvatar(memberId.value, file)
    if (member.value) member.value.avatar_url = updated.avatar_url
    avatarBroken.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? (e.errors.avatar?.[0] ?? e.message) : 'Failed to upload the photo.'
  } finally {
    uploading.value = false
  }
}

const card = 'rounded-lg border border-border bg-background'
const th = 'px-5 py-3 text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground'
const td = 'whitespace-nowrap px-5 py-3 text-neutral-700 dark:text-neutral-200'
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-5">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink :to="{ name: 'members.index' }" aria-label="Back to members" class="rounded-full p-2 transition hover:bg-neutral-200 dark:hover:bg-neutral-800">
        <ChevronLeft class="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
      </RouterLink>
      <div class="flex-1">
        <h1 class="text-page-title text-heading">Member Profile</h1>
        <p class="text-sm text-muted-foreground">Details, accounts and activity.</p>
      </div>
    </div>

    <p v-if="notice" role="status" class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{{ notice }}</p>
    <p v-if="error" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{{ error }}</p>

    <div v-if="loading" class="flex min-h-[50vh] items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <span class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand/20 border-r-brand border-t-brand" aria-hidden="true" />
        <span class="text-xs font-bold uppercase tracking-widest text-brand">Loading Member Data</span>
      </div>
    </div>

    <div v-else-if="member" class="flex flex-col gap-5 lg:flex-row">
      <!-- Left sidebar -->
      <aside class="flex w-full shrink-0 flex-col gap-6 lg:w-[280px]">
        <div :class="[card, 'overflow-hidden']">
          <div class="relative h-[88px] bg-navy">
            <span class="absolute left-1/2 top-4 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-brand/40 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              <Star :size="10" fill="currentColor" class="text-brand" /> Standard
            </span>
          </div>
          <div class="relative z-10 -mt-12 flex justify-center px-4">
            <button type="button" title="Change photo" class="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-brand bg-background shadow-sm" @click="avatarInput?.click()">
              <img v-if="member.avatar_url && !avatarBroken" :src="member.avatar_url" :alt="member.name" class="h-full w-full object-cover" @error="avatarBroken = true" />
              <span v-else class="text-2xl font-bold text-brand">{{ memberInitials(member.name) }}</span>
              <span v-if="uploading" class="absolute inset-0 flex items-center justify-center bg-black/60">
                <span class="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </span>
            </button>
            <input ref="avatarInput" type="file" accept="image/*" class="sr-only" @change="uploadAvatar" />
          </div>
          <div class="mb-5 px-5 pt-3 text-center">
            <h2 class="text-section text-heading">{{ member.name }}</h2>
            <p class="mt-1 text-[13px] tracking-tight text-muted-foreground">ID · {{ member.member_number }}</p>
            <p class="mt-0.5 text-[13px] tracking-tight text-muted-foreground">{{ member.email || '—' }}</p>
            <div class="mt-4">
              <span v-if="member.status === 'active'" class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Member
              </span>
              <span v-else-if="member.status === 'pending'" class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-600">
                <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Pending Approval
              </span>
              <span v-else-if="member.status === 'rejected'" class="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500">
                <span class="h-1.5 w-1.5 rounded-full bg-red-500" /> Rejected
              </span>
              <span v-else class="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span class="h-1.5 w-1.5 rounded-full bg-neutral-400" /> {{ formatEnum(member.status) }}
              </span>
            </div>
          </div>
          <div class="mx-5 mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-border">
            <div class="border-b border-r border-border p-4">
              <span class="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Shares</span>
              <span class="text-base font-bold text-foreground">{{ sharesHeld }}</span>
            </div>
            <div class="border-b border-border p-4">
              <span class="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Gender</span>
              <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset', genderPill(member.gender)]">{{ member.gender || '—' }}</span>
            </div>
            <div class="border-r border-border p-4">
              <span class="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Marital</span>
              <span class="text-base font-bold capitalize text-foreground">{{ member.marital_status || '—' }}</span>
            </div>
            <div class="p-4">
              <span class="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Age</span>
              <span class="text-base font-bold text-foreground">{{ age }}</span>
            </div>
          </div>
        </div>

        <div :class="[card, 'p-6']">
          <h3 class="mb-5 text-subsection text-muted-foreground">Quick Info</h3>
          <div class="space-y-[18px]">
            <label class="block">
              <span class="mb-1.5 block text-[13px] text-muted-foreground">Status</span>
              <select
                id="member-status"
                :value="member.status"
                :disabled="!canChangeStatus || busy || statusOptions.length < 2"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold capitalize text-neutral-800 outline-none focus:border-brand disabled:bg-neutral-50 disabled:text-neutral-500 dark:text-white"
                @change="chooseStatus"
              >
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <div v-for="item in quickInfo" :key="item.label" :class="['flex items-center justify-between gap-3', item.border ? 'mt-1 border-t border-border pt-1' : '']">
              <span class="text-[13px] text-muted-foreground">{{ item.label }}</span>
              <span class="text-right font-mono text-[13px] tracking-tight text-neutral-700 dark:text-neutral-200">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right main area -->
      <div class="flex min-w-0 flex-1 flex-col gap-5">
        <div v-if="member.status === 'pending'" class="flex flex-wrap items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <Clock class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-bold text-amber-800 dark:text-amber-300">Awaiting Approval</p>
            <p class="mt-0.5 text-xs text-amber-700 dark:text-amber-200">This member is pending approval. Deposits, withdrawals, and loans are blocked until an admin approves the registration.</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button type="button" :disabled="busy" class="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50" @click="rejectOpen = true">
              <ShieldX class="h-3.5 w-3.5" /> Reject
            </button>
            <button type="button" :disabled="busy" class="flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50" @click="approve">
              <ShieldCheck class="h-3.5 w-3.5" /> {{ busy ? 'Approving…' : 'Approve Member' }}
            </button>
          </div>
        </div>

        <div v-if="member.status === 'rejected'" class="flex flex-wrap items-start gap-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/30 dark:bg-red-500/10">
          <ShieldX class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-bold text-red-800 dark:text-red-300">Registration Rejected</p>
            <p class="mt-0.5 text-xs text-red-700 dark:text-red-200">
              This member's registration was rejected and cannot transact. {{ member.rejection_reason }}
              <span v-if="member.rejecter"> — {{ member.rejecter.name }}, {{ formatDate(member.rejected_at) }}</span>
            </p>
          </div>
          <button type="button" :disabled="busy" class="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50" @click="requeue">
            <RotateCcw class="h-3.5 w-3.5" /> Send back for approval
          </button>
        </div>

        <PendingReversalsPanel
          :reversals="reversals"
          :can-approve="can('savings.reversals.approve')"
          :current-user-id="user?.id ?? null"
          @decided="savingsChanged"
          @failed="(message) => (error = message)"
        />

        <MemberAccountsTable
          :accounts="member.savings_accounts ?? []"
          :can-transact="canTransact"
          :can-open="canTransact"
          :can-configure-fees="can('savings.products.manage')"
          @custom-fee="openCustomFee"
          @deposit="(account) => startTransaction('deposit', account)"
          @withdraw="(account) => startTransaction('withdrawal', account)"
          @new-account="openAccountOpen = true"
        />

        <div :class="[card, 'overflow-hidden']">
          <div class="flex overflow-x-auto border-b border-border px-4" role="tablist">
            <button
              v-for="item in tabs"
              :key="item.id"
              type="button"
              role="tab"
              :aria-selected="tab === item.id"
              :class="['relative flex items-center gap-2 whitespace-nowrap px-4 py-4 text-[13px] font-bold capitalize transition-colors', tab === item.id ? 'text-brand' : 'text-muted-foreground hover:text-neutral-900 dark:hover:text-white']"
              @click="tab = item.id"
            >
              <component :is="item.icon" :size="16" />
              {{ item.label }}
              <span v-if="item.count !== null" class="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-neutral-100 px-1.5 font-mono text-xs font-bold text-muted-foreground dark:bg-neutral-800">{{ item.count }}</span>
              <span v-if="tab === item.id" class="absolute bottom-0 left-4 right-4 h-[3px] rounded-t-full bg-brand" />
            </button>
          </div>

          <!-- Profile -->
          <div v-if="tab === 'profile'" class="bg-neutral-50/40 p-4 dark:bg-transparent">
            <div class="columns-1 gap-4 md:columns-2 xl:columns-3">
              <section v-for="section in profileSections" :key="section.title" class="mb-4 break-inside-avoid overflow-hidden rounded-lg border border-border bg-background">
                <div class="flex items-center gap-2 border-b border-border bg-neutral-50/50 px-3.5 py-2.5 dark:bg-neutral-800/40">
                  <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand/10"><component :is="section.icon" :size="13" class="text-brand" /></span>
                  <h3 class="text-subsection text-heading">{{ section.title }}</h3>
                </div>
                <div class="divide-y divide-neutral-50 dark:divide-neutral-800">
                  <div v-for="field in section.fields" :key="field.label" class="flex items-start justify-between gap-3 px-3.5 py-2">
                    <span class="flex shrink-0 items-center gap-1.5 pt-px text-sm font-medium text-muted-foreground">
                      <component :is="field.icon" :size="12" class="shrink-0" /> {{ field.label }}
                    </span>
                    <div class="min-w-0 text-right">
                      <template v-if="field.type === 'badge'">
                        <span v-if="field.value" :class="['inline-flex items-center rounded-full px-2 py-0.5 text-sm font-bold capitalize ring-1 ring-inset', badgeClass(field.value)]">{{ field.value }}</span>
                        <span v-else class="text-sm text-neutral-300">—</span>
                      </template>
                      <div v-else-if="field.type === 'copy'" class="flex items-center justify-end gap-1.5">
                        <span class="truncate font-mono text-sm font-bold text-foreground">{{ field.value ?? '—' }}</span>
                        <button v-if="field.value" type="button" title="Copy" class="shrink-0 text-muted-foreground transition-colors hover:text-brand" @click="copy(field.value)">
                          <component :is="copied === field.value ? Check : Copy" :size="13" :class="copied === field.value ? 'text-emerald-500' : ''" />
                        </button>
                      </div>
                      <span v-else-if="field.type === 'currency'" class="text-sm font-bold text-foreground">
                        <template v-if="field.value !== null && field.value !== undefined">{{ CURRENCY }} {{ formatMoney(field.value) }}</template>
                        <span v-else class="text-neutral-300">—</span>
                      </span>
                      <span v-else class="break-words text-sm font-bold text-foreground">
                        <template v-if="field.value">{{ field.value }}</template>
                        <span v-else class="text-neutral-300">—</span>
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <MemberLedger v-else-if="tab === 'transactions'" :transactions="transactions" :balances="balances" mode="all" :can-reverse="can('savings.manage')" :printing="printing" @print="printReceipt" @reverse="startReversal" />
          <MemberLedger v-else-if="tab === 'savings'" :transactions="transactions" :balances="balances" mode="deposit" :can-reverse="can('savings.manage')" :printing="printing" @print="printReceipt" @reverse="startReversal" />
          <MemberLedger v-else-if="tab === 'withdrawal'" :transactions="transactions" :balances="balances" mode="withdrawal" :can-reverse="can('savings.manage')" :printing="printing" @print="printReceipt" @reverse="startReversal" />
          <MemberLedger v-else-if="tab === 'shares'" :transactions="transactions" :balances="balances" mode="shares" />
          <MemberStatement v-else-if="tab === 'statement'" :member-id="member.id" :joined-at="member.joined_at" :accounts="member.savings_accounts ?? []" />
          <MemberExitPanel v-else-if="tab === 'exit'" :member-id="member.id" :member-status="member.status" @changed="load(true)" />

          <!-- Loans -->
          <div v-else class="overflow-x-auto">
            <p v-if="!member.loans?.length" class="px-6 py-10 text-center text-sm text-muted-foreground">No loans.</p>
            <table v-else class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th :class="th">Loan</th><th :class="th">Product</th><th :class="th">Status</th><th :class="[th, 'text-right']">Principal</th><th :class="[th, 'text-right']">Outstanding</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                <tr v-for="loan in member.loans" :key="loan.id">
                  <td :class="[td, 'font-mono text-xs']">
                    <RouterLink :to="{ name: 'loans.show', params: { id: loan.id } }" class="hover:text-brand">{{ loan.loan_number }}</RouterLink>
                  </td>
                  <td :class="td">{{ loan.product?.name ?? '—' }}</td>
                  <td :class="td">{{ formatEnum(loan.status) }}</td>
                  <td :class="[td, 'text-right tabular-nums']">{{ CURRENCY }} {{ formatMoney(loan.principal) }}</td>
                  <td :class="[td, 'text-right font-bold tabular-nums']">{{ CURRENCY }} {{ formatMoney(loan.outstanding_principal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject dialog -->
    <div v-if="rejectOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reject-title">
      <div class="w-full max-w-md rounded-lg bg-background p-6 shadow-2xl">
        <h3 id="reject-title" class="mb-1 text-subsection text-heading">Reject Registration</h3>
        <p class="mb-4 text-xs text-muted-foreground">Optionally give a reason. It is saved with the member's record.</p>
        <textarea v-model="rejectionReason" rows="3" aria-label="Rejection reason" class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm dark:text-white" placeholder="e.g. Missing ID copy" />
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" :disabled="busy" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200" @click="rejectOpen = false">Cancel</button>
          <button type="button" :disabled="busy" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="reject">Reject</button>
        </div>
      </div>
    </div>

    <!-- Reverse transaction dialog -->
    <div v-if="reversing" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reverse-title">
      <form class="w-full max-w-md rounded-lg bg-background p-6 shadow-2xl" @submit.prevent="requestReversal">
        <div class="flex items-start gap-4">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"><RotateCcw :size="20" class="text-amber-600" /></span>
          <div class="min-w-0 flex-1">
            <h3 id="reverse-title" class="text-subsection text-heading">Reverse {{ reversing.type }} of {{ CURRENCY }} {{ formatMoney(reversing.amount) }}?</h3>
            <p class="mt-1 text-sm text-muted-foreground">Transaction <strong class="text-neutral-700 dark:text-neutral-200">{{ reversing.reference || `#${reversing.id}` }}</strong> on {{ reversing.account }}.</p>
            <textarea v-model="reversalReason" required minlength="3" maxlength="1000" rows="3" aria-label="Reason for the reversal" placeholder="Enter a reason for the reversal" class="mt-3 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm dark:text-white" />
            <p class="mt-2 text-xs text-muted-foreground">
              A counter-transaction undoes this entry once someone else with approval rights approves it. The original stays in the audit trail marked as <em>reversed</em>.
            </p>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300" @click="reversing = null">Cancel</button>
          <button type="submit" :disabled="busy || reversalReason.trim().length < 3" class="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50">
            <RotateCcw :size="14" /> Request reversal
          </button>
        </div>
      </form>
    </div>

    <!-- Status change confirmation -->
    <div v-if="statusChange" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="status-title">
      <div class="w-full max-w-md rounded-lg bg-background p-6 shadow-2xl">
        <h3 id="status-title" class="mb-1 text-subsection text-heading">Change member status</h3>
        <p class="mb-4 text-[13px] text-muted-foreground">Move {{ member?.name }} from <strong>{{ formatEnum(member?.status) }}</strong> to <strong>{{ formatEnum(statusChange) }}</strong>?</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200" @click="statusChange = null">Cancel</button>
          <button type="button" :disabled="busy" class="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50" @click="confirmStatusChange">Change status</button>
        </div>
      </div>
    </div>

    <template v-if="member">
      <CustomFeeDrawer v-model:open="feeOpen" :account="feeAccount" @saved="(account) => savingsChanged(`Custom fee saved for ${account.account_number}.`)" />
      <SavingsTransactionDrawer
        v-model:open="transactionOpen"
        :type="transactionType"
        :account="transactionAccount"
        :member-name="member.name"
        @saved="(transaction) => savingsChanged(`${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${CURRENCY} ${formatMoney(transaction.amount)} recorded.`)"
      />
      <OpenSavingsAccountDrawer
        v-model:open="openAccountOpen"
        :member-id="member.id"
        :member-number="member.member_number"
        :existing="member.savings_accounts ?? []"
        @saved="(account) => savingsChanged(`Savings account ${account.account_number} opened.`)"
      />
    </template>
  </div>
</template>
