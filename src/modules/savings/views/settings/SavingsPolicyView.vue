<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/core/components/PageHeader.vue'
import DataPanel from '@/core/components/DataPanel.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Skeleton } from '@/core/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { ApiError } from '@/core/api/http'
import { formatDate, formatEnum } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { savingsPolicyApi } from '../../api'
import type { SavingsPolicy } from '../../types'

/** The SACCO's own savings choices, with a permanent record of every change. */
const { can } = useAuth()

const policy = ref<SavingsPolicy | null>(null)
const form = ref({ exit_notice_days: 60, dormant_accounts_earn_interest: false, default_warning_months: 6 })
const saving = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const canEdit = computed(() => can('savings.products.manage'))

function show(result: SavingsPolicy) {
  policy.value = result
  form.value = {
    exit_notice_days: result.exit_notice_days,
    dormant_accounts_earn_interest: result.dormant_accounts_earn_interest,
    default_warning_months: result.default_warning_months,
  }
}

async function save() {
  saving.value = true
  error.value = null
  notice.value = null
  try {
    show(await savingsPolicyApi.update(form.value))
    notice.value = 'Savings policy saved.'
  } catch (exception) {
    error.value = exception instanceof ApiError ? (Object.values(exception.errors)[0]?.[0] ?? exception.message) : 'The policy could not be saved.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    show(await savingsPolicyApi.show())
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The policy could not be loaded.'
  }
})
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">
    <PageHeader title="Savings policy" description="Your SACCO's own choices. Every change is recorded." />

    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>

    <Skeleton v-if="!policy && !error" class="h-64 w-full bg-muted" />

    <template v-if="policy">
      <DataPanel label="Policy">
        <form class="flex max-w-2xl flex-col gap-5 p-4" @submit.prevent="save">
          <fieldset :disabled="!canEdit || saving" class="flex flex-col gap-5">
            <label class="flex flex-col gap-1 text-sm font-medium">
              Exit notice (days)
              <Input v-model.number="form.exit_notice_days" type="number" min="0" max="365" required class="w-32" />
              <span class="text-xs font-normal text-muted-foreground">Set this from your bye-laws. Ugandan statute fixes no period. Applies to notices given from now on.</span>
            </label>
            <label class="flex flex-col gap-1 text-sm font-medium">
              Default inactivity warning (months)
              <Input v-model.number="form.default_warning_months" type="number" min="1" max="23" required class="w-32" />
              <span class="text-xs font-normal text-muted-foreground">Starting value for new savings products. Each product can change its own.</span>
            </label>
            <label class="flex items-start gap-2 text-sm font-medium">
              <input v-model="form.dormant_accounts_earn_interest" type="checkbox" class="mt-1" />
              <span>
                Dormant accounts earn interest
                <span class="block text-xs font-normal text-muted-foreground">Decide with your Board. The law read so far does not settle this.</span>
              </span>
            </label>
          </fieldset>
          <p class="text-sm text-muted-foreground">The statutory dormancy period is {{ policy.statutory_dormancy_months }} months and cannot be changed here.</p>
          <div v-if="canEdit"><Button type="submit" size="sm" :disabled="saving">Save policy</Button></div>
        </form>
      </DataPanel>

      <DataPanel label="Policy changes">
        <Table v-if="policy.changes.length" class="text-sm tabular-nums">
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Setting</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Changed by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="change in policy.changes" :key="change.id">
              <TableCell>{{ formatDate(change.created_at) }}</TableCell>
              <TableCell>{{ formatEnum(change.field) }}</TableCell>
              <TableCell>{{ change.old_value }}</TableCell>
              <TableCell>{{ change.new_value }}</TableCell>
              <TableCell>{{ change.actor }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-else class="px-4 py-10 text-center text-sm text-muted-foreground">No changes yet.</p>
      </DataPanel>
    </template>
  </div>
</template>
