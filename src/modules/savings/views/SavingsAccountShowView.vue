<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CircleAlert, Hourglass } from 'lucide-vue-next'
import PageHeader from '@/core/components/PageHeader.vue'
import DataPanel from '@/core/components/DataPanel.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { Skeleton } from '@/core/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import MemberStatement from '@/modules/members/components/MemberStatement.vue'
import { savingsAccountsApi } from '../api'
import SavingsAccountActionDrawer, { type SavingsAccountAction } from '../components/SavingsAccountActionDrawer.vue'
import SavingsAccountHistory from '../components/SavingsAccountHistory.vue'
import SavingsTransactionDrawer from '../components/SavingsTransactionDrawer.vue'
import type { SavingsAccount, SavingsAccountEvent, SavingsTransaction } from '../types'

/** One savings account: its balance, restrictions, transactions, statement, terms and history. */
const props = defineProps<{ id: string }>()

type Tab = 'transactions' | 'statement' | 'terms' | 'history'
const TABS: { label: string; value: Tab }[] = [
  { label: 'Transactions', value: 'transactions' },
  { label: 'Statement', value: 'statement' },
  { label: 'Terms', value: 'terms' },
  { label: 'History', value: 'history' },
]

const { can } = useAuth()
const account = ref<SavingsAccount | null>(null)
const transactions = ref<SavingsTransaction[]>([])
const events = ref<SavingsAccountEvent[]>([])
const lastPage = ref(1)
const page = ref(1)
const tab = ref<Tab>('transactions')
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const actionOpen = ref(false)
const action = ref<SavingsAccountAction>('close')
const transactionOpen = ref(false)
const transactionType = ref<'deposit' | 'withdrawal'>('deposit')

const canManage = computed(() => can('savings.manage'))
const isClosed = computed(() => account.value?.status === 'closed')
const isFrozen = computed(() => Boolean(account.value?.frozen_at))
const canRequest = computed(() => canManage.value && !account.value?.pending_request)

const figures = computed(() => {
  const data = account.value
  if (!data) return []
  return [
    { label: 'Balance', value: formatMoney(data.balance), note: `Minimum ${formatMoney(data.product?.minimum_balance)}`, color: 'bg-brand' },
    { label: 'Available to withdraw', value: formatMoney(data.available_balance), note: isFrozen.value ? 'Account is frozen' : data.status === 'active' ? 'After minimum and guarantees' : `Account is ${data.status}`, color: 'bg-navy' },
    { label: 'Pledged by member', value: formatMoney(data.pledged_amount), note: 'Guarantees across all accounts', color: 'bg-blue' },
    { label: 'Last member activity', value: data.last_member_activity_at ? formatDate(data.last_member_activity_at) : 'None', note: `Opened ${formatDate(data.opened_at)}`, color: 'bg-ink dark:bg-navy-mid' },
  ]
})

const terms = computed(() => {
  const product = account.value?.product
  return [
    { label: 'Product', value: product?.name },
    { label: 'Interest rate', value: product ? `${product.interest_rate}%` : null },
    { label: 'Minimum balance', value: formatMoney(product?.minimum_balance) },
    { label: 'Monthly fee', value: account.value?.custom_monthly_fee_enabled ? `${account.value.custom_monthly_fee_amount} (this account only)` : product?.monthly_fee_enabled ? product.monthly_fee_amount : 'None' },
    { label: 'Opened', value: formatDate(account.value?.opened_at) },
    { label: 'Closed', value: formatDate(account.value?.closed_at) },
  ]
})

async function loadAccount() {
  account.value = await savingsAccountsApi.show(Number(props.id))
}

async function loadTransactions(target = 1) {
  const response = await savingsAccountsApi.transactions(Number(props.id), target)
  transactions.value = response.data
  page.value = response.meta.current_page
  lastPage.value = response.meta.last_page
}

async function loadEvents() {
  events.value = await savingsAccountsApi.events(Number(props.id))
}

async function load() {
  error.value = null
  try {
    await Promise.all([loadAccount(), loadTransactions(), loadEvents()])
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The account could not be loaded.'
  }
}

function startAction(next: SavingsAccountAction) {
  action.value = next
  actionOpen.value = true
}

function startTransaction(type: 'deposit' | 'withdrawal') {
  transactionType.value = type
  transactionOpen.value = true
}

function changed(message: string) {
  notice.value = message
  void load()
}

watch(() => props.id, load, { immediate: true })
</script>

<template>
  <div class="tw-scope @container flex flex-col gap-4">
    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>

    <div v-if="!account && !error" class="flex flex-col gap-4" aria-busy="true" aria-label="Loading account">
      <Skeleton class="h-16 w-full bg-muted" />
      <Skeleton class="h-24 w-full bg-muted" />
      <Skeleton class="h-72 w-full bg-muted" />
    </div>

    <template v-if="account">
      <PageHeader :title="account.account_number" :description="`${account.product?.name ?? 'Savings'} account`">
        <template v-if="!isClosed">
          <Button v-if="canManage" size="sm" @click="startTransaction('deposit')">Deposit</Button>
          <Button v-if="canManage" variant="outline" size="sm" :disabled="account.status !== 'active' || isFrozen" @click="startTransaction('withdrawal')">Withdraw</Button>
          <Button v-if="canManage && !isFrozen" variant="outline" size="sm" @click="startAction('freeze')">Freeze</Button>
          <Button v-if="canManage && account.status === 'active'" variant="outline" size="sm" @click="startAction('dormant')">Mark dormant</Button>
          <Button v-if="canRequest && isFrozen" variant="outline" size="sm" @click="startAction('release_freeze')">Request release</Button>
          <Button v-if="canRequest && account.status === 'dormant'" variant="outline" size="sm" @click="startAction('reactivate')">Request reactivation</Button>
          <Button v-if="canRequest && account.status === 'active' && !isFrozen" variant="outline" size="sm" @click="startAction('close')">Request closure</Button>
        </template>
      </PageHeader>

      <div class="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge :status="account.status" />
        <StatusBadge v-if="isFrozen" status="frozen" />
        <RouterLink v-if="account.member" :to="{ name: 'members.show', params: { id: account.member_id } }" class="font-medium text-brand hover:underline">{{ account.member.name }}</RouterLink>
      </div>

      <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>

      <div v-if="isFrozen" role="alert" class="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>Frozen on {{ formatDate(account.frozen_at) }}: {{ formatEnum(account.freeze_reason_code) }}. {{ account.freeze_reason }}</span>
      </div>

      <div v-if="account.pending_request" class="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        <Hourglass class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {{ formatEnum(account.pending_request.type) }} requested by {{ account.pending_request.requested_by }} is waiting for approval.
          <RouterLink :to="{ name: 'savings.approvals' }" class="font-medium underline">Open approvals</RouterLink>
        </span>
      </div>

      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="figure in figures" :key="figure.label" class="min-w-0 rounded-lg px-3.5 py-3 text-white ring-1 ring-white/10" :class="figure.color">
          <dt class="text-xs text-white/85">{{ figure.label }}</dt>
          <dd class="mt-1 text-xl font-bold tabular-nums">{{ figure.value }}</dd>
          <dd class="mt-0.5 text-xs text-white/85">{{ figure.note }}</dd>
        </div>
      </dl>

      <DataPanel :label="`Account ${account.account_number}`">
        <template #toolbar><SegmentedControl v-model="tab" :options="TABS" label="Account section" /></template>

        <template v-if="tab === 'transactions'">
          <Table v-if="transactions.length" class="text-sm tabular-nums">
            <TableHeader>
              <TableRow class="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead class="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="transaction in transactions" :key="transaction.id">
                <TableCell>{{ formatDate(transaction.transacted_at) }}</TableCell>
                <TableCell>{{ formatEnum(transaction.type) }}<span v-if="transaction.reversed_at" class="text-muted-foreground"> (reversed)</span></TableCell>
                <TableCell class="text-muted-foreground">{{ transaction.reference ?? '—' }}</TableCell>
                <TableCell class="text-right font-medium">{{ formatMoney(transaction.amount) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-else class="px-4 py-10 text-center text-sm text-muted-foreground">No transactions yet.</p>
          <footer v-if="lastPage > 1" class="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-[0.8125rem] text-muted-foreground">
            <span class="tabular-nums">Page {{ page }} of {{ lastPage }}</span>
            <div class="flex gap-1">
              <Button variant="outline" size="sm" :disabled="page <= 1" @click="loadTransactions(page - 1)">Previous</Button>
              <Button variant="outline" size="sm" :disabled="page >= lastPage" @click="loadTransactions(page + 1)">Next</Button>
            </div>
          </footer>
        </template>

        <MemberStatement v-else-if="tab === 'statement'" :accounts="[account]" />

        <dl v-else-if="tab === 'terms'" class="grid grid-cols-1 gap-x-8 gap-y-3 p-4 text-sm sm:grid-cols-2">
          <div v-for="term in terms" :key="term.label" class="flex justify-between gap-4 border-b border-border pb-2">
            <dt class="text-muted-foreground">{{ term.label }}</dt>
            <dd class="font-medium">{{ term.value ?? '—' }}</dd>
          </div>
        </dl>

        <SavingsAccountHistory v-else :events="events" />
      </DataPanel>

      <SavingsAccountActionDrawer v-model:open="actionOpen" :action="action" :account="account" @saved="changed" />
      <SavingsTransactionDrawer
        v-model:open="transactionOpen"
        :type="transactionType"
        :account="account"
        :member-name="account.member?.name ?? ''"
        @saved="(transaction) => changed(`${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} recorded.`)"
      />
    </template>
  </div>
</template>
