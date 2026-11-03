<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Paperclip, Printer, Trash2, TriangleAlert, Upload } from 'lucide-vue-next'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatEnum, formatMoney, formatTime } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { expensesApi } from '../api'
import ExpenseDrawer from '../components/ExpenseDrawer.vue'
import ExpensePayDialog from '../components/ExpensePayDialog.vue'
import ExpenseReasonDialog from '../components/ExpenseReasonDialog.vue'
import { EXPENSE_STATUS } from '../labels'
import { printExpenseVoucher } from '../print'
import type { Expense, ExpenseAttachment } from '../types'

/** One expense: what it was, and what can still be done with it. */
const props = defineProps<{ id: string }>()
const router = useRouter()
const { can, user } = useAuth()

type Prompt = 'reject' | 'undo' | 'decline-undo'

const PROMPTS: Record<Prompt, { title: string; label: string; confirmLabel: string; destructive?: boolean }> = {
  reject: { title: 'Reject expense', label: 'Why is it being rejected?', confirmLabel: 'Reject', destructive: true },
  undo: { title: 'Undo this expense', label: 'What went wrong? The expense stays on record, and its effect on the accounts is removed.', confirmLabel: 'Undo expense', destructive: true },
  'decline-undo': { title: 'Decline undo', label: 'Why is the undo declined?', confirmLabel: 'Decline' },
}

const ACTIONS: Record<string, string> = {
  created: 'Added',
  edited: 'Changed',
  submitted: 'Sent for approval',
  approved: 'Approved',
  rejected: 'Rejected',
  posted: 'Paid and added to the accounts',
  backfilled: 'Added to the accounts from old records',
  reversal_requested: 'Undo requested',
  reversal_rejected: 'Undo declined',
  reversed: 'Undone',
  attachment_added: 'Receipt added',
  attachment_removed: 'Receipt removed',
}

const expense = ref<Expense | null>(null)
const loadError = ref('')
const actionError = ref<string | null>(null)
const busy = ref(false)
const prompt = ref<Prompt | null>(null)
const paying = ref(false)
const editing = ref(false)
const confirmingDelete = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const voucherId = computed(() => Number(props.id))
const status = computed(() => (expense.value ? EXPENSE_STATUS[expense.value.status] : null))
const pendingUndo = computed(() => expense.value?.reversals?.find((reversal) => reversal.status === 'pending') ?? null)
const isRecorder = computed(() => expense.value?.recorded_by === user.value?.id || expense.value?.recorded_by === null)
const isUnposted = computed(() => !!expense.value && !['posted', 'reversed', 'cancelled'].includes(expense.value.status))
const allowed = computed(() => {
  const voucher = expense.value
  const state = voucher?.status
  const isOwnApproval = !!voucher && [voucher.recorded_by, voucher.payee_user_id].includes(user.value?.id ?? -1)
  return {
    change: isUnposted.value && isRecorder.value && can('expenses.create') && (voucher?.lines?.length ?? 0) <= 1,
    remove: isUnposted.value && isRecorder.value && can('expenses.create'),
    approve: state === 'pending_approval' && can('expenses.approve') && !isOwnApproval,
    pay: state === 'approved' && can('expenses.create'),
    undo: state === 'posted' && !pendingUndo.value && can('expenses.create'),
    decideUndo: !!pendingUndo.value && can('expenses.approve') && pendingUndo.value.requested_by !== user.value?.id,
    attach: !!state && !['reversed', 'cancelled'].includes(state) && can('expenses.create'),
    removeReceipt: isUnposted.value && can('expenses.create'),
  }
})

async function load() {
  loadError.value = ''
  try {
    expense.value = await expensesApi.show(voucherId.value)
  } catch {
    loadError.value = 'This expense could not be loaded.'
  }
}

watch(() => props.id, load, { immediate: true })

/** Run one step, then show what the server now says. A refusal stays on screen in its own words. */
async function run(step: () => Promise<Expense>): Promise<boolean> {
  busy.value = true
  actionError.value = null
  try {
    expense.value = await step()
    return true
  } catch (exception) {
    actionError.value = exception instanceof Error ? exception.message : 'That could not be done.'
    return false
  } finally {
    busy.value = false
  }
}

async function answerPrompt(reason: string) {
  const undo = pendingUndo.value
  const done = await run(() => {
    if (prompt.value === 'reject') return expensesApi.reject(voucherId.value, reason)
    if (prompt.value === 'undo') return expensesApi.undo(voucherId.value, reason)
    return expensesApi.declineUndo(undo?.id ?? 0, reason)
  })
  if (done) prompt.value = null
}

const approve = () => run(() => expensesApi.approve(voucherId.value))

function approveUndo() {
  const undo = pendingUndo.value
  if (undo) void run(() => expensesApi.approveUndo(undo.id))
}

async function pay(_amount: string, paidOn: string, accountId: number) {
  if (await run(() => expensesApi.pay(voucherId.value, paidOn, accountId))) paying.value = false
}

async function remove() {
  busy.value = true
  actionError.value = null
  try {
    await expensesApi.remove(voucherId.value)
    await router.push({ name: 'expenses.index' })
  } catch (exception) {
    actionError.value = exception instanceof Error ? exception.message : 'It could not be deleted.'
    confirmingDelete.value = false
  } finally {
    busy.value = false
  }
}

const detach = (attachment: ExpenseAttachment) => run(() => expensesApi.detach(voucherId.value, attachment.id))

async function attach(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await run(() => expensesApi.attach(voucherId.value, file))
  input.value = ''
}

const openAttachment = (attachment: ExpenseAttachment) => expensesApi.downloadAttachment(voucherId.value, attachment).catch(() => {
  actionError.value = 'The file could not be downloaded.'
})

const money = (value: string | number) => `UGX ${formatMoney(value)}`
const kilobytes = (size: number) => `${Math.max(1, Math.round(size / 1024))} KB`
const card = 'rounded-lg border border-border bg-background'
const term = 'text-xs font-semibold text-muted-foreground'
</script>

<template>
  <div class="tw-scope flex flex-col gap-6">
    <p v-if="loadError" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ loadError }}</p>

    <template v-if="expense && status">
      <PageHeader :title="expense.description" :description="expense.number ?? undefined">
        <Button variant="outline" size="sm" @click="printExpenseVoucher(expense)"><Printer /> Print</Button>
        <Button v-if="allowed.change" variant="outline" size="sm" :disabled="busy" @click="editing = true">Change</Button>
        <Button v-if="allowed.remove" variant="outline" size="sm" :disabled="busy" @click="confirmingDelete = true">Delete</Button>
        <Button v-if="allowed.undo" variant="outline" size="sm" :disabled="busy" @click="prompt = 'undo'">Undo expense</Button>
        <Button v-if="allowed.approve" variant="outline" size="sm" :disabled="busy" @click="prompt = 'reject'">Reject</Button>
        <Button v-if="allowed.approve" size="sm" :disabled="busy" @click="approve">Approve</Button>
        <Button v-if="allowed.pay" size="sm" :disabled="busy" @click="paying = true">Mark as paid</Button>
      </PageHeader>

      <p v-if="actionError" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ actionError }}</p>
      <p v-if="expense.status === 'pending_approval' && !allowed.approve" class="rounded-md bg-muted px-3 py-2 text-sm text-foreground">This is above the approval limit, so someone else needs to approve it.</p>
      <p v-if="expense.status === 'rejected'" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">Rejected: {{ expense.rejection_reason }}</p>

      <div v-if="expense.possible_duplicates?.length" class="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
        <TriangleAlert :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          This may be a duplicate. The same payee and amount were recorded within a week:
          <template v-for="(duplicate, index) in expense.possible_duplicates" :key="duplicate.id">
            <template v-if="index">, </template><RouterLink :to="{ name: 'expenses.show', params: { id: duplicate.id } }" class="underline">{{ formatDate(duplicate.expense_date) }}</RouterLink>
          </template>.
        </p>
      </div>

      <div v-if="pendingUndo" class="flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
        <p>{{ pendingUndo.requester_name ?? 'Someone' }} asked to undo this: {{ pendingUndo.reason }}</p>
        <div v-if="allowed.decideUndo" class="flex gap-2">
          <Button variant="outline" size="sm" :disabled="busy" @click="prompt = 'decline-undo'">Decline</Button>
          <Button size="sm" :disabled="busy" @click="approveUndo">Approve undo</Button>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <section :class="[card, 'min-w-0 self-start xl:col-span-2']">
          <dl class="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt :class="term">Status</dt><dd class="mt-1"><span class="badge" :class="`badge--${status.badge}`">{{ status.label }}</span></dd></div>
            <div><dt :class="term">Amount</dt><dd class="mt-1 text-sm font-semibold tabular-nums">{{ money(expense.amount) }}</dd></div>
            <div><dt :class="term">Category</dt><dd class="mt-1 text-sm">{{ expense.categories?.join(', ') }}</dd></div>
            <div><dt :class="term">Date</dt><dd class="mt-1 text-sm">{{ formatDate(expense.expense_date) }}</dd></div>
            <div><dt :class="term">Paid to</dt><dd class="mt-1 text-sm">{{ expense.payee ?? '—' }}</dd></div>
            <div><dt :class="term">Paid from</dt><dd class="mt-1 text-sm">{{ expense.paid_from ?? 'Not paid yet' }}</dd></div>
            <div v-if="Number(expense.wht_amount)"><dt :class="term">Tax withheld</dt><dd class="mt-1 text-sm tabular-nums">{{ money(expense.wht_amount) }}</dd></div>
            <div v-if="expense.reference"><dt :class="term">Reference</dt><dd class="mt-1 text-sm">{{ expense.reference }}</dd></div>
            <div v-if="expense.resolution_reference"><dt :class="term">Resolution</dt><dd class="mt-1 text-sm">{{ expense.resolution_reference }}</dd></div>
            <div><dt :class="term">Added by</dt><dd class="mt-1 text-sm">{{ expense.recorder_name ?? '—' }}</dd></div>
            <div v-if="expense.approver_name"><dt :class="term">Approved by</dt><dd class="mt-1 text-sm">{{ expense.approver_name }}</dd></div>
          </dl>
        </section>

        <div class="flex min-w-0 flex-col gap-6">
          <section :class="card">
            <div class="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <h2 class="text-section text-heading">Receipts</h2>
              <template v-if="allowed.attach">
                <input ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png" class="sr-only" aria-label="Add a receipt" @change="attach" />
                <Button variant="outline" size="sm" :disabled="busy" @click="fileInput?.click()"><Upload /> Add</Button>
              </template>
            </div>
            <ul v-if="expense.attachments?.length" class="divide-y divide-border">
              <li v-for="attachment in expense.attachments" :key="attachment.id" class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <Paperclip :size="14" class="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <button type="button" class="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-medium hover:underline" @click="openAttachment(attachment)">{{ attachment.original_name }}</button>
                  <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ kilobytes(attachment.size) }}</span>
                  <button v-if="allowed.removeReceipt" type="button" :aria-label="`Remove ${attachment.original_name}`" class="grid size-7 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground hover:text-destructive" @click="detach(attachment)"><Trash2 :size="14" aria-hidden="true" /></button>
                </div>
                <p v-if="attachment.also_on.length" class="mt-1 text-xs text-amber-800 dark:text-amber-300">The same file is on another expense: {{ attachment.also_on.join(', ') }}.</p>
              </li>
            </ul>
            <p v-else class="px-5 py-6 text-sm text-muted-foreground">No receipt added.</p>
          </section>

          <section :class="card">
            <h2 class="border-b border-border px-5 py-3 text-section text-heading">History</h2>
            <ol class="flex flex-col gap-3 px-5 py-4">
              <li v-for="event in expense.events" :key="event.id" class="text-sm">
                <p class="font-medium">{{ ACTIONS[event.action] ?? formatEnum(event.action) }}</p>
                <p class="text-xs text-muted-foreground">{{ event.actor }} · {{ formatDate(event.created_at) }} {{ formatTime(event.created_at) }}</p>
                <p v-if="event.reason" class="mt-0.5 break-words text-xs text-muted-foreground">{{ event.reason }}</p>
              </li>
            </ol>
          </section>
        </div>
      </div>

      <ExpenseDrawer v-model:open="editing" :expense="expense" @saved="(saved) => (expense = saved)" />
      <ExpenseReasonDialog v-if="prompt" v-bind="PROMPTS[prompt]" :busy="busy" :error="actionError" @confirm="answerPrompt" @cancel="prompt = null" />
      <ExpensePayDialog v-if="paying" :title="`Pay UGX ${formatMoney(expense.net_paid)}`" confirm-label="Mark as paid" :busy="busy" :error="actionError" @confirm="pay" @cancel="paying = false" />

      <div v-if="confirmingDelete" class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="delete-expense-title" @click.self="confirmingDelete = false">
        <div class="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
          <h2 id="delete-expense-title" class="mb-2 text-section text-heading">Delete expense</h2>
          <p class="text-sm text-muted-foreground">It has not reached the accounts, so nothing else changes.</p>
          <div class="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" :disabled="busy" @click="confirmingDelete = false">Back</Button>
            <Button variant="destructive" size="sm" :disabled="busy" @click="remove">{{ busy ? 'Deleting…' : 'Delete' }}</Button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
