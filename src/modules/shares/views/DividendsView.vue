<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { useForm } from '@/core/composables/useForm'
import { formatDate, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { dividendsApi, shareAppropriationsApi, shareProductsApi } from '../api'
import DividendDetailDrawer from '../components/DividendDetailDrawer.vue'
import type { DividendDeclarations, ShareAppropriations, ShareProduct } from '../types'

const { can } = useAuth()
const lastYear = new Date().getFullYear() - 1
const dividends = ref<DividendDeclarations | null>(null)
const appropriations = ref<ShareAppropriations | null>(null)
const products = ref<ShareProduct[]>([])
const loading = ref(false)
const error = ref('')
const notice = ref('')
const preparing = ref(false)
const viewing = ref(false)
const viewingId = ref<number | null>(null)

const policy = computed(() => dividends.value?.meta)
const waitingNote = computed(() => {
  const meta = policy.value
  if (!meta) return ''
  if (meta.first_dividend_year === null) return 'The waiting period starts with the first share purchase.'
  return meta.first_dividend_year > lastYear
    ? `No dividend yet. The first one can be declared for the ${meta.first_dividend_year} financial year, after it closes.`
    : `Dividends can be declared from the ${meta.first_dividend_year} financial year.`
})

const appropriation = useForm({ financial_year: lastYear, share_transfer_fund_rate: 0, agm_reference: '' }, (data) => shareAppropriationsApi.create({ ...data, agm_reference: data.agm_reference || null }))
const prepare = useForm({ share_product_id: 0, financial_year: lastYear, rate: 10, notes: '' }, (data) => dividendsApi.prepare({ ...data, notes: data.notes || null }))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [dividendList, appropriationList, productList] = await Promise.all([dividendsApi.list(), shareAppropriationsApi.list(), shareProductsApi.list({ active: true })])
    dividends.value = dividendList
    appropriations.value = appropriationList
    products.value = productList.data
    prepare.data.share_product_id ||= products.value[0]?.id ?? 0
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not load dividends.'
  } finally {
    loading.value = false
  }
}

async function appropriate() {
  const result = await appropriation.submit()
  if (!result) return
  notice.value = `${result.financial_year} surplus appropriated: ${formatMoney(result.reserve_fund_amount)} to the Reserve Fund and ${formatMoney(result.share_transfer_fund_amount)} to the Share Transfer Fund.`
  await load()
}

async function savePrepare() {
  const result = await prepare.submit()
  if (!result) return
  preparing.value = false
  await load()
  show(result.id)
}

function show(id: number) {
  viewingId.value = id
  viewing.value = true
}

onMounted(load)
</script>

<template>
  <section class="panel dividends">
    <header class="panel__header">
      <h1>Dividends</h1>
      <div class="panel__actions">
        <button v-if="can('shares.dividends.manage')" type="button" class="btn btn--primary" @click="preparing = true">Prepare dividend</button>
      </div>
    </header>

    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
    <p v-if="notice" class="muted" role="status">{{ notice }}</p>

    <dl v-if="policy" class="policy">
      <div><dt>Operations started</dt><dd>{{ policy.operations_started_on ? formatDate(policy.operations_started_on) : 'Not yet' }}</dd></div>
      <div><dt>Waiting period</dt><dd>{{ policy.waiting_years }} years</dd></div>
      <div><dt>First dividend year</dt><dd>{{ policy.first_dividend_year ?? '—' }}</dd></div>
      <div><dt>Maximum rate</dt><dd>{{ policy.maximum_rate }}% a year</dd></div>
    </dl>
    <p class="muted">{{ waitingNote }}<template v-if="policy?.minimum_holding_months"> Members must hold shares for {{ policy.minimum_holding_months }} months to qualify.</template></p>

    <div class="table-wrap" :aria-busy="loading">
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Product</th>
            <th class="num">Rate</th>
            <th class="num">Total</th>
            <th class="num">Members</th>
            <th>Status</th>
            <th>AGM</th>
            <th class="num">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in dividends?.data ?? []" :key="item.id">
            <td>{{ item.financial_year }}</td>
            <td>{{ item.product?.name }}</td>
            <td class="num">{{ item.rate }}%</td>
            <td class="num">{{ formatMoney(item.total_amount) }}</td>
            <td class="num">{{ item.eligible_members }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td>{{ item.agm_reference ?? '—' }}</td>
            <td class="num"><button type="button" class="btn btn--small" @click="show(item.id)">Open</button></td>
          </tr>
          <tr v-if="!loading && dividends && dividends.data.length === 0">
            <td colspan="8" class="empty">No dividends yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel dividends">
    <header class="panel__header"><h1>Year-end appropriation</h1></header>
    <p class="muted">
      Before a dividend, each closed year's surplus goes {{ appropriations?.meta.reserve_fund_rate ?? '10.00' }}% to the Reserve Fund and up to
      {{ appropriations?.meta.share_transfer_fund_maximum_rate ?? '5.00' }}% of share capital to the Share Transfer Fund, at the rate UMRA sets.
      The Share Transfer Fund holds {{ formatMoney(appropriations?.meta.share_transfer_fund_balance) }} for buy-backs.
    </p>
    <form v-if="can('accounting.manage')" class="appropriate" @submit.prevent="appropriate">
      <p v-if="appropriation.message.value" class="alert alert--error span-all" role="alert">{{ appropriation.message.value }}</p>
      <FormField label="Financial year" :error="appropriation.error('financial_year')">
        <input v-model.number="appropriation.data.financial_year" type="number" min="2000" :max="lastYear" required />
      </FormField>
      <FormField label="Share Transfer Fund rate (%)" :error="appropriation.error('share_transfer_fund_rate')">
        <input v-model.number="appropriation.data.share_transfer_fund_rate" type="number" min="0" max="5" step="0.01" required />
      </FormField>
      <FormField label="AGM reference" :error="appropriation.error('agm_reference')">
        <input v-model="appropriation.data.agm_reference" maxlength="255" />
      </FormField>
      <div class="appropriate__submit">
        <button type="submit" class="btn btn--primary" :disabled="appropriation.processing.value">Appropriate surplus</button>
      </div>
    </form>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th class="num">Surplus</th>
            <th class="num">Reserve Fund</th>
            <th class="num">Share Transfer Fund</th>
            <th class="num">Left for dividends</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in appropriations?.data ?? []" :key="row.id">
            <td>{{ row.financial_year }}</td>
            <td class="num">{{ formatMoney(row.surplus) }}</td>
            <td class="num">{{ formatMoney(row.reserve_fund_amount) }} <span class="muted">({{ row.reserve_fund_rate }}%)</span></td>
            <td class="num">{{ formatMoney(row.share_transfer_fund_amount) }} <span class="muted">({{ row.share_transfer_fund_rate }}%)</span></td>
            <td class="num">{{ formatMoney(row.distributable) }}</td>
          </tr>
          <tr v-if="appropriations && appropriations.data.length === 0">
            <td colspan="5" class="empty">No year has been appropriated yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <AppDrawer
    v-model:open="preparing"
    title="Prepare dividend"
    description="Calculates each member's dividend as a draft. Preparing again for the same year and product recalculates the draft."
    save-button-text="Calculate"
    :loading="prepare.processing.value"
    @save="savePrepare"
  >
    <p v-if="prepare.message.value" class="alert alert--error" role="alert">{{ prepare.message.value }}</p>
    <div class="form-grid">
      <FormField label="Share product" :error="prepare.error('share_product_id')">
        <select v-model.number="prepare.data.share_product_id" required>
          <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
        </select>
      </FormField>
      <FormField label="Financial year" :error="prepare.error('financial_year')">
        <input v-model.number="prepare.data.financial_year" type="number" min="2000" :max="lastYear" required />
      </FormField>
      <FormField :label="`Rate (%), at most ${policy?.maximum_rate ?? '10.00'}`" :error="prepare.error('rate')">
        <input v-model.number="prepare.data.rate" type="number" min="0.01" :max="policy?.maximum_rate ?? 10" step="0.01" required />
      </FormField>
      <FormField label="Notes" class="span-all" :error="prepare.error('notes')">
        <input v-model="prepare.data.notes" maxlength="2000" />
      </FormField>
    </div>
  </AppDrawer>

  <DividendDetailDrawer v-model:open="viewing" :declaration-id="viewingId" @changed="load" />
</template>

<style scoped>
.dividends + .dividends { margin-top: 1.25rem; }
.policy { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.75rem; margin: 0 0 0.5rem; }
.policy dt { font-size: 0.8rem; color: var(--muted); }
.policy dd { margin: 0.2rem 0 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.dividends > .muted { margin: 0 0 1rem; max-width: 70ch; }
.appropriate { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.75rem 1rem; align-items: end; margin-bottom: 1.25rem; }
.appropriate__submit { display: flex; }
</style>
