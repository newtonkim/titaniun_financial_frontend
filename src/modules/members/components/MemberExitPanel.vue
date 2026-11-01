<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Skeleton } from '@/core/components/ui/skeleton'
import { formatDate, formatEnum, formatMoney, today } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { memberExitsApi } from '../api'
import type { MemberExit, MemberExitType } from '../types'

/**
 * A member leaving: the notice, a live settlement statement and what still has to clear. It moves no
 * money; staff pay out, repay and transfer on the usual screens, then send the exit for approval.
 */
const props = defineProps<{ memberId: number; memberStatus: string }>()
const emit = defineEmits<{ changed: [] }>()

const TYPES: MemberExitType[] = ['withdrawal', 'death', 'expulsion']
const { can } = useAuth()
const exit = ref<MemberExit | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const form = ref({ type: 'withdrawal' as MemberExitType, notice_given_on: today(), reason: '' })

const canManage = computed(() => can('members.manage'))
const inProgress = computed(() => exit.value?.status === 'settling' || exit.value?.status === 'awaiting_approval')
const canStart = computed(() => canManage.value && !inProgress.value && props.memberStatus !== 'exited')
const settled = computed(() => exit.value?.settlement.blockers.length === 0)

async function run(action: () => Promise<MemberExit>) {
  busy.value = true
  error.value = null
  try {
    exit.value = await action()
    emit('changed')
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The exit could not be updated.'
  } finally {
    busy.value = false
  }
}

const start = () => run(() => memberExitsApi.start(props.memberId, form.value))

function submit() {
  const id = exit.value?.id
  if (id) void run(() => memberExitsApi.submit(id))
}

function cancel() {
  const id = exit.value?.id
  if (id) void run(() => memberExitsApi.cancel(id))
}

onMounted(async () => {
  try {
    exit.value = await memberExitsApi.show(props.memberId)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The exit could not be loaded.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="tw-scope flex flex-col gap-4 p-4 md:p-6">
    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <Skeleton v-if="loading" class="h-48 w-full bg-muted" />

    <template v-else>
      <section v-if="exit" class="flex flex-col gap-4" aria-label="Member exit">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-section text-heading">{{ formatEnum(exit.type) }}</h2>
          <StatusBadge :status="exit.status" />
          <span class="text-sm text-muted-foreground">Notice given {{ formatDate(exit.notice_given_on) }}<template v-if="exit.notice_days">, {{ exit.notice_days }} days, earliest exit {{ formatDate(exit.earliest_exit_on) }}</template></span>
        </div>
        <p class="text-sm text-muted-foreground">{{ exit.reason }}</p>
        <p v-if="exit.rejection_reason" class="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">Sent back by {{ exit.decided_by }}: {{ exit.rejection_reason }}</p>

        <dl v-if="inProgress" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-brand px-3.5 py-3 text-white"><dt class="text-xs text-white/85">Savings</dt><dd class="mt-1 text-xl font-bold tabular-nums">{{ formatMoney(exit.settlement.savings_total) }}</dd></div>
          <div class="rounded-lg bg-navy px-3.5 py-3 text-white"><dt class="text-xs text-white/85">Loans outstanding</dt><dd class="mt-1 text-xl font-bold tabular-nums">{{ formatMoney(exit.settlement.loans_total) }}</dd></div>
          <div class="rounded-lg bg-blue px-3.5 py-3 text-white"><dt class="text-xs text-white/85">Savings after loans</dt><dd class="mt-1 text-xl font-bold tabular-nums">{{ formatMoney(exit.settlement.net_savings_after_loans) }}</dd><dd class="mt-0.5 text-xs text-white/85">Estimate; shares not included</dd></div>
        </dl>

        <div v-if="inProgress" class="rounded-lg border border-border">
          <h3 class="border-b border-border px-4 py-2.5 text-subsection text-heading">Still to clear</h3>
          <ul v-if="exit.settlement.blockers.length" class="divide-y divide-border">
            <li v-for="blocker in exit.settlement.blockers" :key="blocker" class="flex items-start gap-2 px-4 py-2.5 text-sm">
              <CircleAlert class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />{{ blocker }}
            </li>
          </ul>
          <p v-else class="flex items-center gap-2 px-4 py-3 text-sm text-success"><CircleCheck class="size-4" aria-hidden="true" />Everything is settled.</p>
        </div>

        <div v-if="inProgress && exit.settlement.savings.length" class="flex flex-wrap gap-2 text-sm">
          <RouterLink v-for="account in exit.settlement.savings" :key="account.id" :to="{ name: 'savings.accounts.show', params: { id: account.id } }" class="text-brand hover:underline">{{ account.account_number }}</RouterLink>
        </div>

        <div v-if="inProgress && exit.type === 'death'" class="rounded-lg border border-border px-4 py-3 text-sm">
          <h3 class="font-semibold text-foreground">Share nominees</h3>
          <ul v-if="exit.settlement.nominees.length" class="mt-1 text-muted-foreground">
            <li v-for="nominee in exit.settlement.nominees" :key="nominee.name">{{ nominee.name }}, {{ nominee.relationship }}, {{ nominee.percentage }}%<template v-if="!nominee.witnessed"> (not witnessed)</template></li>
          </ul>
          <p v-else class="mt-1 text-muted-foreground">No share nominee recorded.</p>
        </div>

        <div v-if="canManage && exit.status === 'settling'" class="flex gap-2">
          <Button size="sm" :disabled="busy || !settled" @click="submit">Send for approval</Button>
          <Button variant="outline" size="sm" :disabled="busy" @click="cancel">Cancel exit</Button>
        </div>
        <p v-if="exit.status === 'awaiting_approval'" class="text-sm text-muted-foreground">Waiting for a second person in <RouterLink :to="{ name: 'savings.approvals' }" class="text-brand underline">Savings approvals</RouterLink>.</p>
      </section>

      <form v-if="canStart" class="flex max-w-xl flex-col gap-3 rounded-lg border border-border p-4" @submit.prevent="start">
        <h2 class="text-section text-heading">Start an exit</h2>
        <p class="text-sm text-muted-foreground">Records the notice. Nothing changes on the member's accounts until a second person approves the finished exit.</p>
        <label class="flex flex-col gap-1 text-sm font-medium">
          Type
          <select v-model="form.type" class="rounded-md"><option v-for="type in TYPES" :key="type" :value="type">{{ formatEnum(type) }}</option></select>
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium">
          Notice given on
          <Input v-model="form.notice_given_on" type="date" :max="today()" required />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium">
          Reason
          <textarea v-model="form.reason" required minlength="3" maxlength="1000" rows="3" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" />
        </label>
        <div><Button type="submit" size="sm" :disabled="busy">Record notice</Button></div>
      </form>

      <p v-if="!exit && !canStart" class="py-10 text-center text-sm text-muted-foreground">No exit recorded.</p>
    </template>
  </div>
</template>
