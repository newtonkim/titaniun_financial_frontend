<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { ApiError } from '@/core/api/http'
import { formatDate, formatMoney, today } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { dividendsApi } from '../api'
import type { DividendDeclaration } from '../types'

/** One dividend's payouts, with the AGM approval and payment steps. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ declarationId: number | null }>()
const emit = defineEmits<{ changed: [] }>()

const { can } = useAuth()
const declaration = ref<DividendDeclaration | null>(null)
const busy = ref(false)
const error = ref('')
const errors = ref<Record<string, string[]>>({})
const approval = reactive({ agm_reference: '', agm_held_on: today() })

const excluded = computed(() => declaration.value?.payouts?.filter((payout) => !payout.eligible) ?? [])
const unpaid = computed(() => declaration.value?.payouts?.filter((payout) => payout.eligible && !payout.paid_at && Number(payout.amount) > 0).length ?? 0)

async function run(action: () => Promise<DividendDeclaration>) {
  busy.value = true
  error.value = ''
  errors.value = {}
  try {
    declaration.value = await action()
    emit('changed')
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The request failed.'
    errors.value = failure instanceof ApiError ? failure.errors : {}
  } finally {
    busy.value = false
  }
}

const approve = () => declaration.value && run(() => dividendsApi.approve(declaration.value!.id, { ...approval }))
const pay = () => declaration.value && run(() => dividendsApi.pay(declaration.value!.id))

watch(
  () => [open.value, props.declarationId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      declaration.value = null
      void run(() => dividendsApi.show(id))
    }
  },
)
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="declaration ? `${declaration.financial_year} dividend · ${declaration.rate}%` : 'Dividend'"
    description="Members earn the rate on their weighted average share balance for the year."
    :show-footer="false"
    width="w-full sm:max-w-[760px]"
  >
    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
    <template v-if="declaration">
      <dl class="dividend-summary">
        <div><dt>Status</dt><dd><StatusBadge :status="declaration.status" /></dd></div>
        <div><dt>Total payable</dt><dd>{{ formatMoney(declaration.total_amount) }}</dd></div>
        <div><dt>Eligible members</dt><dd>{{ declaration.eligible_members }}</dd></div>
        <div><dt>Weighted share capital</dt><dd>{{ formatMoney(declaration.weighted_capital) }}</dd></div>
      </dl>
      <p v-if="declaration.agm_reference" class="muted">
        Approved at {{ declaration.agm_reference }} on {{ formatDate(declaration.agm_held_on) }}<template v-if="declaration.approved_by"> by {{ declaration.approved_by }}</template>.
      </p>

      <form v-if="declaration.status === 'draft' && can('shares.dividends.approve')" class="dividend-step" @submit.prevent="approve">
        <h2>Record AGM approval</h2>
        <div class="form-grid">
          <FormField label="AGM reference" :error="errors.agm_reference?.[0]">
            <input v-model="approval.agm_reference" required maxlength="255" placeholder="e.g. AGM minute 4/2027" />
          </FormField>
          <FormField label="AGM date" :error="errors.agm_held_on?.[0]">
            <input v-model="approval.agm_held_on" type="date" :max="today()" required />
          </FormField>
        </div>
        <div class="form-actions"><button type="submit" class="btn btn--primary" :disabled="busy">Approve dividend</button></div>
      </form>

      <div v-else-if="declaration.status === 'approved' && can('shares.dividends.manage')" class="dividend-step">
        <h2>Pay members</h2>
        <p class="muted">Credits {{ unpaid }} {{ unpaid === 1 ? 'member' : 'members' }}' dividends to their active savings accounts. Members without one stay payable until a later run.</p>
        <div class="form-actions"><button type="button" class="btn btn--primary" :disabled="busy || unpaid === 0" @click="pay">Credit to savings</button></div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th class="num">Weighted balance</th>
              <th class="num">Dividend</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payout in declaration.payouts ?? []" :key="payout.id">
              <td>{{ payout.member_name }} <span class="muted">· {{ payout.account_number }}</span></td>
              <td class="num">{{ formatMoney(payout.weighted_balance) }}</td>
              <td class="num">{{ formatMoney(payout.amount) }}</td>
              <td class="payout-status">
                <span v-if="!payout.eligible" class="muted">{{ payout.ineligible_reason }}</span>
                <span v-else-if="payout.paid_at">Paid {{ formatDate(payout.paid_at) }}</span>
                <span v-else class="muted">Not paid</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="excluded.length" class="muted">{{ excluded.length }} {{ excluded.length === 1 ? 'member is' : 'members are' }} excluded. Their reasons are listed above.</p>
    </template>
    <p v-else-if="busy" class="muted" role="status">Loading dividend…</p>
  </AppDrawer>
</template>

<style scoped>
.dividend-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.75rem; margin: 0 0 1rem; }
.dividend-summary dt { font-size: 0.8rem; color: var(--muted); }
.dividend-summary dd { margin: 0.2rem 0 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.dividend-step { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 1rem; }
.payout-status { white-space: normal; max-width: 18rem; }
</style>
