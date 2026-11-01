<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Inbox, X } from 'lucide-vue-next'
import DataPanel from '@/core/components/DataPanel.vue'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Skeleton } from '@/core/components/ui/skeleton'
import { formatDate, formatEnum } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import PendingReversalsPanel from '@/modules/members/components/PendingReversalsPanel.vue'
import { savingsAccountRequestsApi, savingsReversalsApi } from '../api'
import type { SavingsAccountRequest, SavingsReversal } from '../types'

/** Everything in savings that waits for a second person: account requests and transaction reversals. */
const { can, user } = useAuth()

const requests = ref<SavingsAccountRequest[]>([])
const reversals = ref<SavingsReversal[]>([])
const loading = ref(true)
const busy = ref<number | null>(null)
const rejecting = ref<number | null>(null)
const reason = ref('')
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const canApprove = computed(() => can('savings.accounts.approve'))
const currentUserId = computed(() => user.value?.id ?? null)
const isEmpty = computed(() => !requests.value.length && !reversals.value.length)
const ownRequest = (request: SavingsAccountRequest) => request.requested_by_id === currentUserId.value

async function load() {
  loading.value = true
  try {
    const [accountRequests, pendingReversals] = await Promise.all([savingsAccountRequestsApi.list({ status: 'pending' }), savingsReversalsApi.list({ status: 'pending' })])
    requests.value = accountRequests
    reversals.value = pendingReversals
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Approvals could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function decide(request: SavingsAccountRequest, approve: boolean) {
  busy.value = request.id
  error.value = null
  try {
    if (approve) {
      await savingsAccountRequestsApi.approve(request.id)
    } else {
      await savingsAccountRequestsApi.reject(request.id, reason.value.trim())
    }
    notice.value = `${formatEnum(request.type)} on ${request.account_number} ${approve ? 'approved' : 'rejected'}.`
    rejecting.value = null
    reason.value = ''
    await load()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The request could not be decided.'
  } finally {
    busy.value = null
  }
}

function decided(message: string) {
  notice.value = message
  void load()
}

onMounted(load)
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">
    <PageHeader title="Savings approvals" description="Requests waiting for a second person. Nobody can approve their own request." />

    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>

    <div v-if="loading && isEmpty" class="flex flex-col gap-3" aria-busy="true" aria-label="Loading approvals">
      <Skeleton v-for="row in 3" :key="row" class="h-20 w-full bg-muted" />
    </div>

    <div v-else-if="isEmpty" class="flex flex-col items-center gap-2 rounded-lg border border-border bg-background px-4 py-14 text-center">
      <Inbox class="size-6 text-muted-foreground" aria-hidden="true" />
      <p class="font-medium">Nothing waiting for approval</p>
      <p class="text-sm text-muted-foreground">Closures, reactivations, freeze releases and reversals appear here.</p>
    </div>

    <DataPanel v-if="requests.length" label="Account requests">
      <ul class="divide-y divide-border">
        <li v-for="request in requests" :key="request.id" class="p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 text-sm">
              <p class="font-semibold text-foreground">
                {{ formatEnum(request.type) }}
                <RouterLink :to="{ name: 'savings.accounts.show', params: { id: request.savings_account_id } }" class="font-mono text-xs text-brand hover:underline">{{ request.account_number }}</RouterLink>
                <span class="text-muted-foreground"> · {{ request.member_name }}</span>
              </p>
              <p class="mt-0.5 text-muted-foreground">{{ request.reason }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">Requested by {{ request.requested_by }} on {{ formatDate(request.created_at) }}</p>
            </div>
            <div v-if="canApprove" class="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" :disabled="busy === request.id" @click="rejecting = rejecting === request.id ? null : request.id"><X /> Reject</Button>
              <Button size="sm" :disabled="busy === request.id || ownRequest(request)" :title="ownRequest(request) ? 'Someone else must approve your own request' : undefined" @click="decide(request, true)"><Check /> Approve</Button>
            </div>
          </div>
          <form v-if="rejecting === request.id" class="mt-3 flex flex-col gap-2 sm:flex-row" @submit.prevent="decide(request, false)">
            <input v-model="reason" required minlength="3" maxlength="1000" placeholder="Why is it rejected?" aria-label="Rejection reason" class="flex-1" />
            <Button type="submit" variant="outline" size="sm" :disabled="busy === request.id">Reject request</Button>
          </form>
        </li>
      </ul>
    </DataPanel>

    <PendingReversalsPanel :reversals="reversals" :can-approve="can('savings.reversals.approve')" :current-user-id="currentUserId" @decided="decided" @failed="error = $event" />
  </div>
</template>
