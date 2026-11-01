<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Printer } from 'lucide-vue-next'
import AppDrawer from '@/core/components/AppDrawer.vue'
import DataPanel from '@/core/components/DataPanel.vue'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Skeleton } from '@/core/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatDate, formatMoney, today } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { savingsDormancyApi } from '../api'
import SavingsAccountActionDrawer from '../components/SavingsAccountActionDrawer.vue'
import type { SavingsAccount, SavingsDormantEntry } from '../types'

/**
 * The Tier 4 Act's dormant register: accounts to review, and those on the register with their notice,
 * advert and Board decision. Nothing here moves money or changes an account without an officer.
 */
type RecordKind = 'notice' | 'advert' | 'board-decision'

const COPY: Record<RecordKind, { title: string; reference: string; date: string }> = {
  notice: { title: 'Record notice sent', reference: 'Letter or delivery reference', date: 'Date sent' },
  advert: { title: 'Record advert', reference: 'Publication and page', date: 'Date published' },
  'board-decision': { title: 'Record Board decision', reference: 'Minute reference', date: 'Date decided' },
}

const { can } = useAuth()
const candidates = ref<SavingsAccount[]>([])
const entries = ref<SavingsDormantEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const confirmOpen = ref(false)
const confirming = ref<SavingsAccount | null>(null)
const recordOpen = ref(false)
const recording = ref(false)
const recordError = ref<string | null>(null)
const recordKind = ref<RecordKind>('notice')
const recordEntry = ref<SavingsDormantEntry | null>(null)
const recordForm = ref({ date: today(), reference: '', decision: '' })

const canManage = computed(() => can('savings.manage'))
const canDecide = computed(() => can('savings.accounts.approve'))
const isAdvertDue = (entry: SavingsDormantEntry) => !entry.advertised_on && entry.advert_due_on <= today()

async function load() {
  loading.value = true
  try {
    const [accounts, register] = await Promise.all([savingsDormancyApi.candidates(), savingsDormancyApi.register()])
    candidates.value = accounts
    entries.value = register
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The register could not be loaded.'
  } finally {
    loading.value = false
  }
}

function confirmDormant(account: SavingsAccount) {
  confirming.value = account
  confirmOpen.value = true
}

function startRecord(entry: SavingsDormantEntry, kind: RecordKind) {
  recordEntry.value = entry
  recordKind.value = kind
  recordForm.value = { date: today(), reference: '', decision: '' }
  recordError.value = null
  recordOpen.value = true
}

async function saveRecord() {
  if (!recordEntry.value) return
  recording.value = true
  recordError.value = null
  try {
    const { date, reference, decision } = recordForm.value
    await savingsDormancyApi.record(recordEntry.value.id, recordKind.value, recordKind.value === 'board-decision' ? { date, reference, decision } : { date, reference })
    notice.value = `Saved for ${recordEntry.value.account_number}.`
    recordOpen.value = false
    await load()
  } catch (exception) {
    recordError.value = exception instanceof Error ? exception.message : 'The record could not be saved.'
  } finally {
    recording.value = false
  }
}

function changed(message: string) {
  notice.value = message
  void load()
}

const print = () => window.print()

onMounted(load)
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">
    <PageHeader title="Dormant register" description="Accounts with no member activity for two years, and what has been done about them.">
      <Button variant="outline" size="sm" @click="print"><Printer /> Print</Button>
    </PageHeader>

    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>

    <Skeleton v-if="loading && !entries.length && !candidates.length" class="h-64 w-full bg-muted" />

    <template v-else>
      <DataPanel v-if="candidates.length" label="Accounts to review">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-bold normal-case tracking-normal text-navy dark:text-white">To review</h2>
          <p class="text-sm text-muted-foreground">Check with the member first. An officer confirms before an account moves to the register.</p>
        </div>
        <Table class="text-sm tabular-nums">
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>Account</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead class="text-right">Balance</TableHead>
              <TableHead><span class="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="account in candidates" :key="account.id">
              <TableCell><RouterLink :to="{ name: 'savings.accounts.show', params: { id: account.id } }" class="font-semibold text-navy hover:text-brand hover:underline dark:text-white">{{ account.account_number }}</RouterLink></TableCell>
              <TableCell>{{ account.member?.name }}</TableCell>
              <TableCell class="text-muted-foreground">{{ formatDate(account.last_member_activity_at) }}</TableCell>
              <TableCell class="text-right font-medium">{{ formatMoney(account.balance) }}</TableCell>
              <TableCell class="text-right"><Button v-if="canManage" variant="outline" size="sm" @click="confirmDormant(account)">Mark dormant</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DataPanel>

      <DataPanel label="Register">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-bold normal-case tracking-normal text-navy dark:text-white">On the register</h2>
          <p class="text-sm text-muted-foreground">A Board decision is a record only. Any transfer of unclaimed money stays a separate step.</p>
        </div>
        <Table v-if="entries.length" class="text-sm tabular-nums">
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>Account</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Dormant since</TableHead>
              <TableHead class="text-right">Balance on entry</TableHead>
              <TableHead>Notice</TableHead>
              <TableHead>Advert</TableHead>
              <TableHead>Board decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="entry in entries" :key="entry.id">
              <TableCell><RouterLink :to="{ name: 'savings.accounts.show', params: { id: entry.savings_account_id } }" class="font-semibold text-navy hover:text-brand hover:underline dark:text-white">{{ entry.account_number }}</RouterLink></TableCell>
              <TableCell>{{ entry.member_name }}</TableCell>
              <TableCell>{{ formatDate(entry.dormant_since) }}</TableCell>
              <TableCell class="text-right font-medium">{{ formatMoney(entry.balance_on_entry) }}</TableCell>
              <TableCell>
                <span v-if="entry.notice_sent_on" :title="entry.notice_reference ?? undefined">{{ formatDate(entry.notice_sent_on) }}</span>
                <Button v-else-if="canManage" variant="outline" size="sm" @click="startRecord(entry, 'notice')">Record</Button>
                <span v-else class="text-muted-foreground">Not sent</span>
              </TableCell>
              <TableCell>
                <span v-if="entry.advertised_on" :title="entry.advert_reference ?? undefined">{{ formatDate(entry.advertised_on) }}</span>
                <Button v-else-if="canManage && isAdvertDue(entry)" variant="outline" size="sm" @click="startRecord(entry, 'advert')">Record</Button>
                <span v-else class="text-muted-foreground">Due {{ formatDate(entry.advert_due_on) }}</span>
              </TableCell>
              <TableCell>
                <span v-if="entry.board_decided_on" :title="entry.board_decision ?? undefined">{{ entry.board_reference }}, {{ formatDate(entry.board_decided_on) }}</span>
                <Button v-else-if="canDecide" variant="outline" size="sm" @click="startRecord(entry, 'board-decision')">Record</Button>
                <span v-else class="text-muted-foreground">None</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-else class="px-4 py-10 text-center text-sm text-muted-foreground">No accounts on the register.</p>
      </DataPanel>
    </template>

    <SavingsAccountActionDrawer v-if="confirming" v-model:open="confirmOpen" action="dormant" :account="confirming" @saved="changed" />

    <AppDrawer v-model:open="recordOpen" :title="COPY[recordKind].title" :description="recordEntry?.account_number" :loading="recording" @save="saveRecord">
      <div class="flex flex-col gap-4">
        <p v-if="recordError" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ recordError }}</p>
        <label class="flex flex-col gap-1 text-sm font-medium">
          {{ COPY[recordKind].date }}
          <Input v-model="recordForm.date" type="date" required />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium">
          {{ COPY[recordKind].reference }}
          <Input v-model="recordForm.reference" required minlength="3" maxlength="255" />
        </label>
        <label v-if="recordKind === 'board-decision'" class="flex flex-col gap-1 text-sm font-medium">
          Decision
          <textarea v-model="recordForm.decision" required minlength="3" maxlength="1000" rows="4" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" />
        </label>
      </div>
    </AppDrawer>
  </div>
</template>
