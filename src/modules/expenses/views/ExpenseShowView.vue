<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { FileText, Paperclip, Printer, Trash2, TriangleAlert, Upload } from 'lucide-vue-next'
import PageHeader from '@/core/components/PageHeader.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatDate, formatEnum, formatMoney, formatTime } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { expensesApi } from '../api'
import ExpensePayDialog from '../components/ExpensePayDialog.vue'
import ExpenseReasonDialog from '../components/ExpenseReasonDialog.vue'
import { printExpenseVoucher } from '../print'
import type { Expense, ExpenseAttachment, ExpenseReversal } from '../types'

/** One voucher: what it is, where it stands, and what can be done next. */
const props = defineProps<{ id: string }>()
const router = useRouter()
const { can, user } = useAuth()

type Prompt = 'reject' | 'cancel' | 'reverse' | 'decline-reversal'

const PROMPTS: Record<Prompt, { title: string; label: string; confirmLabel: string; destructive?: boolean }> = {
  reject: { title: 'Reject voucher', label: 'Why is it being rejected?', confirmLabel: 'Reject', destructive: true },
  cancel: { title: 'Cancel voucher', label: 'Why is it being cancelled?', confirmLabel: 'Cancel voucher', destructive: true },
  reverse: { title: 'Request a reversal', label: 'Why does this need reversing?', confirmLabel: 'Request reversal', destructive: true },
  'decline-reversal': { title: 'Decline reversal', label: 'Why is the reversal declined?', confirmLabel: 'Decline' },
}

const ACTIONS: Record<string, string> = {
  created: 'Raised',
  edited: 'Edited',
  submitted: 'Submitted for approval',
  recalled: 'Recalled to draft',
  approved: 'Approved',
  rejected: 'Rejected',
  reopened: 'Reopened',
  cancelled: 'Cancelled',
  posted: 'Paid and posted',
  backfilled: 'Posted from old records',
  reversal_requested: 'Reversal requested',
  reversal_rejected: 'Reversal declined',
  reversed: 'Reversed',
  attachment_added: 'Attachment added',
  attachment_removed: 'Attachment removed',
}

const expense = ref<Expense | null>(null)
const loadError = ref('')
const actionError = ref<string | null>(null)
const busy = ref(false)
const prompt = ref<Prompt | null>(null)
const paying = ref(false)
const confirmingDelete = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const pendingReversal = computed(() => expense.value?.reversals?.find((reversal) => reversal.status === 'pending') ?? null)
const isMaker = computed(() => expense.value?.recorded_by === user.value?.id)
const isSelfApprover = computed(() => {
  const voucher = expense.value
  return !!voucher && [voucher.recorded_by, voucher.submitted_by, voucher.payee_user_id].includes(user.value?.id ?? -1)
})
const can_ = computed(() => {
  const status = expense.value?.status
  return {
    edit: status === 'draft' && isMaker.value && can('expenses.create'),
    submit: status === 'draft' && isMaker.value && can('expenses.create'),
    recall: status === 'pending_approval' && isMaker.value && can('expenses.create'),
    approve: status === 'pending_approval' && can('expenses.approve') && !isSelfApprover.value,
    reopen: status === 'rejected' && isMaker.value && can('expenses.create'),
    cancel: (status === 'rejected' || status === 'approved') && can('expenses.create'),
    pay: status === 'approved' && can('expenses.pay'),
    reverse: status === 'posted' && !pendingReversal.value && can('expenses.reverse'),
    decideReversal: !!pendingReversal.value && can('expenses.reversal.approve') && pendingReversal.value.requested_by !== user.value?.id,
    attach: !!status && !['reversed', 'cancelled'].includes(status) && can('expenses.create'),
  }
})
const waitingNote = computed(() => {
  const voucher = expense.value
  if (voucher?.status === 'pending_approval' && isSelfApprover.value) return 'Someone else must approve this voucher, because you raised it or it pays you.'
  if (pendingReversal.value && pendingReversal.value.requested_by === user.value?.id) return 'Someone else must approve your reversal request.'
  return null
})

async function load() {
  loadError.value = ''
  try {
    expense.value = await expensesApi.show(Number(props.id))
  } catch {
    loadError.value = 'This voucher could not be loaded.'
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
    actionError.value = exception instanceof Error ? exception.message : 'That step could not be completed.'
    return false
  } finally {
    busy.value = false
  }
}

const voucherId = computed(() => Number(props.id))
const step = (action: 'submit' | 'recall' | 'approve' | 'reopen') => run(() => expensesApi[action](voucherId.value))

async function answerPrompt(reason: string) {
  const reversal = pendingReversal.value
  const done = await run(() => {
    if (prompt.value === 'reject') return expensesApi.reject(voucherId.value, reason)
    if (prompt.value === 'cancel') return expensesApi.cancel(voucherId.value, reason)
    if (prompt.value === 'reverse') return expensesApi.requestReversal(voucherId.value, reason)
    return expensesApi.rejectReversal((reversal as ExpenseReversal).id, reason)
  })
  if (done) prompt.value = null
}

async function pay(paidOn: string, accountId: number) {
  if (await run(() => expensesApi.pay(voucherId.value, paidOn, accountId))) paying.value = false
}

async function remove() {
  busy.value = true
  actionError.value = null
  try {
    await expensesApi.remove(voucherId.value)
    await router.push({ name: 'expenses.index' })
  } catch (exception) {
    actionError.value = exception instanceof Error ? exception.message : 'The draft could not be deleted.'
    confirmingDelete.value = false
  } finally {
    busy.value = false
  }
}

function approveReversal() {
  const reversal = pendingReversal.value
  if (reversal) void run(() => expensesApi.approveReversal(reversal.id))
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

    <template v-if="expense">
      <PageHeader :title="expense.number ?? `Draft voucher #${expense.id}`" :description="expense.description">
        <Button variant="outline" size="sm" @click="printExpenseVoucher(expense)"><Printer /> Print</Button>
        <Button v-if="can_.edit" as-child variant="outline" size="sm"><RouterLink :to="{ name: 'expenses.edit', params: { id: expense.id } }">Edit</RouterLink></Button>
        <Button v-if="can_.edit" variant="outline" size="sm" :disabled="busy" @click="confirmingDelete = true">Delete</Button>
        <Button v-if="can_.submit" size="sm" :disabled="busy" @click="step('submit')">Submit for approval</Button>
        <Button v-if="can_.recall" variant="outline" size="sm" :disabled="busy" @click="step('recall')">Recall</Button>
        <Button v-if="can_.approve" variant="outline" size="sm" :disabled="busy" @click="prompt = 'reject'">Reject</Button>
        <Button v-if="can_.approve" size="sm" :disabled="busy" @click="step('approve')">Approve</Button>
        <Button v-if="can_.reopen" size="sm" :disabled="busy" @click="step('reopen')">Reopen as draft</Button>
        <Button v-if="can_.cancel" variant="outline" size="sm" :disabled="busy" @click="prompt = 'cancel'">Cancel voucher</Button>
        <Button v-if="can_.pay" size="sm" :disabled="busy" @click="paying = true">Record payment</Button>
        <Button v-if="can_.reverse" variant="outline" size="sm" :disabled="busy" @click="prompt = 'reverse'">Request reversal</Button>
      </PageHeader>

      <p v-if="actionError" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ actionError }}</p>
      <p v-if="waitingNote" class="rounded-md bg-muted px-3 py-2 text-sm text-foreground">{{ waitingNote }}</p>
      <p v-if="expense.status === 'rejected'" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">Rejected: {{ expense.rejection_reason }}</p>
      <p v-if="expense.status === 'cancelled'" class="rounded-md bg-muted px-3 py-2 text-sm text-foreground">Cancelled: {{ expense.cancellation_reason }}</p>
      <p v-if="expense.is_legacy && expense.status === 'approved'" class="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">Recorded before vouchers reached the accounts. Record how it was paid so it reaches the ledger.</p>

      <div v-if="expense.possible_duplicates?.length" class="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
        <TriangleAlert :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Possible duplicate: same payee and amount within a week as
          <template v-for="(duplicate, index) in expense.possible_duplicates" :key="duplicate.id">
            <template v-if="index">, </template><RouterLink :to="{ name: 'expenses.show', params: { id: duplicate.id } }" class="underline">{{ duplicate.number ?? `draft #${duplicate.id}` }}</RouterLink>
          </template>.
        </p>
      </div>

      <div v-if="pendingReversal" class="flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
        <p>Reversal requested by {{ pendingReversal.requester_name ?? 'staff' }}: {{ pendingReversal.reason }}</p>
        <div v-if="can_.decideReversal" class="flex gap-2">
          <Button variant="outline" size="sm" :disabled="busy" @click="prompt = 'decline-reversal'">Decline</Button>
          <Button size="sm" :disabled="busy" @click="approveReversal">Approve reversal</Button>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <section :class="card">
            <dl class="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div><dt :class="term">Status</dt><dd class="mt-1"><StatusBadge :status="expense.status" /></dd></div>
              <div><dt :class="term">Paid to</dt><dd class="mt-1 text-sm font-medium">{{ expense.payee ?? '—' }}</dd></div>
              <div><dt :class="term">Total</dt><dd class="mt-1 text-sm font-semibold tabular-nums">{{ money(expense.amount) }}</dd></div>
              <div><dt :class="term">Invoice date</dt><dd class="mt-1 text-sm">{{ formatDate(expense.expense_date) }}</dd></div>
              <div><dt :class="term">Paid on</dt><dd class="mt-1 text-sm">{{ expense.paid_on ? formatDate(expense.paid_on) : 'Not yet' }}</dd></div>
              <div><dt :class="term">Paid from</dt><dd class="mt-1 text-sm">{{ expense.paid_from ?? '—' }}</dd></div>
              <div v-if="Number(expense.wht_amount)"><dt :class="term">Tax withheld</dt><dd class="mt-1 text-sm tabular-nums">{{ money(expense.wht_amount) }}</dd></div>
              <div v-if="Number(expense.wht_amount)"><dt :class="term">Paid to payee</dt><dd class="mt-1 text-sm tabular-nums">{{ money(expense.net_paid) }}</dd></div>
              <div v-if="Number(expense.vat_amount)"><dt :class="term">VAT included</dt><dd class="mt-1 text-sm tabular-nums">{{ money(expense.vat_amount) }}</dd></div>
              <div v-if="expense.supplier_invoice_no"><dt :class="term">Invoice number</dt><dd class="mt-1 text-sm">{{ expense.supplier_invoice_no }}</dd></div>
              <div v-if="expense.reference"><dt :class="term">Reference</dt><dd class="mt-1 text-sm">{{ expense.reference }}</dd></div>
              <div v-if="expense.resolution_reference"><dt :class="term">Resolution</dt><dd class="mt-1 text-sm">{{ expense.resolution_reference }}</dd></div>
              <div v-if="expense.journal_voucher"><dt :class="term">Journal</dt><dd class="mt-1 text-sm"><RouterLink :to="{ name: 'accounting.journal-entries' }" class="underline">{{ expense.journal_voucher }}</RouterLink></dd></div>
              <div><dt :class="term">Raised by</dt><dd class="mt-1 text-sm">{{ expense.recorder_name ?? '—' }}</dd></div>
              <div v-if="expense.approver_name"><dt :class="term">Approved by</dt><dd class="mt-1 text-sm">{{ expense.approver_name }}</dd></div>
            </dl>
          </section>

          <section :class="[card, 'overflow-hidden']">
            <h2 class="border-b border-border px-5 py-3 text-section text-heading">Lines</h2>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Category</TableHead><TableHead>Detail</TableHead><TableHead class="text-right">VAT</TableHead><TableHead class="text-right">Amount</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="line in expense.lines" :key="line.id">
                  <TableCell class="font-medium">{{ line.category }}</TableCell>
                  <TableCell>{{ line.description || '—' }}</TableCell>
                  <TableCell class="text-right tabular-nums">{{ Number(line.vat_amount) ? formatMoney(line.vat_amount) : '—' }}</TableCell>
                  <TableCell class="text-right font-medium tabular-nums">{{ formatMoney(line.amount) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </div>

        <div class="flex min-w-0 flex-col gap-6">
          <section :class="card">
            <div class="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <h2 class="text-section text-heading">Receipts</h2>
              <template v-if="can_.attach">
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
                  <button v-if="expense.status === 'draft' && can_.edit" type="button" :aria-label="`Remove ${attachment.original_name}`" class="grid size-7 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground hover:text-destructive" @click="detach(attachment)"><Trash2 :size="14" aria-hidden="true" /></button>
                </div>
                <p v-if="attachment.also_on.length" class="mt-1 text-xs text-amber-800 dark:text-amber-300">The same file is on {{ attachment.also_on.join(', ') }}.</p>
              </li>
            </ul>
            <div v-else class="px-5 py-6 text-sm text-muted-foreground">
              <template v-if="expense.no_receipt_reason">No receipt: {{ expense.no_receipt_reason }}</template>
              <template v-else>No receipts yet.</template>
            </div>
          </section>

          <section :class="card">
            <h2 class="border-b border-border px-5 py-3 text-section text-heading">History</h2>
            <ol class="flex flex-col gap-3 px-5 py-4">
              <li v-for="event in expense.events" :key="event.id" class="flex gap-3 text-sm">
                <FileText :size="14" class="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div class="min-w-0">
                  <p class="font-medium">{{ ACTIONS[event.action] ?? formatEnum(event.action) }}</p>
                  <p class="text-xs text-muted-foreground">{{ event.actor }} · {{ formatDate(event.created_at) }} {{ formatTime(event.created_at) }}</p>
                  <p v-if="event.reason" class="mt-0.5 break-words text-xs text-muted-foreground">{{ event.reason }}</p>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </div>

      <ExpenseReasonDialog v-if="prompt" v-bind="PROMPTS[prompt]" :busy="busy" :error="actionError" @confirm="answerPrompt" @cancel="prompt = null" />
      <ExpensePayDialog v-if="paying" :amount="expense.net_paid" :busy="busy" :error="actionError" @confirm="pay" @cancel="paying = false" />

      <div v-if="confirmingDelete" class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="delete-voucher-title" @click.self="confirmingDelete = false">
        <div class="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
          <h2 id="delete-voucher-title" class="mb-2 text-section text-heading">Delete draft</h2>
          <p class="text-sm text-muted-foreground">Delete this draft and its receipts? The deletion stays on the audit record.</p>
          <div class="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" :disabled="busy" @click="confirmingDelete = false">Back</Button>
            <Button variant="destructive" size="sm" :disabled="busy" @click="remove">{{ busy ? 'Deleting…' : 'Delete' }}</Button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
