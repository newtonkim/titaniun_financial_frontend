<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import DataPanel from '@/core/components/DataPanel.vue'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Skeleton } from '@/core/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { shareRegisterApi } from '../api'
import AllotSharesDrawer from '../components/AllotSharesDrawer.vue'
import type { ShareRegister } from '../types'

const { can } = useAuth()
const register = ref<ShareRegister | null>(null)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const allotting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    register.value = await shareRegisterApi.show()
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not load the share register.'
  } finally {
    loading.value = false
  }
}

function allotted(count: number) {
  notice.value = `Shares allotted to ${count} ${count === 1 ? 'member' : 'members'} and posted to share capital.`
  void load()
}

onMounted(load)
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">
    <PageHeader title="Share register" description="Who holds shares, and whether each member is in good standing.">
      <Button v-if="can('shares.manage')" size="sm" @click="allotting = true"><Plus /> Allot shares</Button>
    </PageHeader>

    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>

    <dl v-if="register" class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">Paid-up share capital</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ formatMoney(register.meta.paid_up_capital) }}</dd>
      </div>
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">Shareholders</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ register.meta.shareholders }}</dd>
      </div>
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">Most one member may hold ({{ register.meta.maximum_holding_fraction }})</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ formatMoney(register.meta.maximum_holding) }}</dd>
      </div>
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">Minimum savings</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ formatMoney(register.meta.minimum_savings) }}</dd>
      </div>
    </dl>
    <p v-if="register && !register.meta.ownership_limit_applies" class="text-sm text-muted-foreground">
      The ownership limit applies once three members hold shares. Use an allotment to load the founders together.
    </p>

    <DataPanel label="Share register">
      <Table class="text-[0.8125rem] tabular-nums" :aria-busy="loading || undefined">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead>Member</TableHead>
            <TableHead>Code</TableHead>
            <TableHead class="text-right">Shares</TableHead>
            <TableHead class="text-right">Share capital</TableHead>
            <TableHead class="text-right">Of total</TableHead>
            <TableHead class="text-right">Savings</TableHead>
            <TableHead>Standing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody v-if="!register && loading">
          <TableRow v-for="row in 6" :key="row" class="hover:bg-transparent">
            <TableCell v-for="column in 7" :key="column" class="py-2.5"><Skeleton class="h-4 w-full max-w-32 bg-muted" /></TableCell>
          </TableRow>
        </TableBody>
        <TableBody v-else>
          <TableRow v-for="row in register?.data ?? []" :key="row.member_id">
            <TableCell>
              <RouterLink class="font-semibold text-navy underline-offset-2 hover:underline dark:text-white" :to="{ name: 'members.show', params: { id: row.member_id } }">{{ row.name }}</RouterLink>
            </TableCell>
            <TableCell class="text-muted-foreground">{{ row.member_number }}</TableCell>
            <TableCell class="text-right font-medium">{{ row.shares_held }}</TableCell>
            <TableCell class="text-right font-medium">{{ formatMoney(row.share_capital) }}</TableCell>
            <TableCell class="text-right font-medium">{{ row.percentage }}%</TableCell>
            <TableCell class="text-right font-medium">{{ formatMoney(row.savings_balance) }}</TableCell>
            <TableCell class="whitespace-normal">
              <span class="badge" :class="row.in_good_standing ? 'badge--active' : 'badge--pending'">{{ row.in_good_standing ? 'Good standing' : 'Action needed' }}</span>
              <span v-if="row.reasons.length" class="mt-0.5 block max-w-88 text-xs text-muted-foreground">{{ row.reasons.join(' ') }}</span>
            </TableCell>
          </TableRow>
          <TableRow v-if="!loading && register && register.data.length === 0" class="hover:bg-transparent">
            <TableCell :colspan="7" class="py-14 text-center">
              <p class="font-medium">No member holds shares yet</p>
              <p class="mt-1 text-muted-foreground">Allot the founders' shares to start the register.</p>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </DataPanel>

    <AllotSharesDrawer v-model:open="allotting" @allotted="allotted" />
  </div>
</template>
