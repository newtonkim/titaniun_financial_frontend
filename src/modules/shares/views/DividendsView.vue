<script setup lang="ts">
import DataPanel from '@/core/components/DataPanel.vue'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
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
  <div class="tw-scope flex flex-col gap-4">
    <PageHeader title="Dividends" :description="waitingNote">
      <Button v-if="can('shares.dividends.manage')" size="sm" @click="preparing = true">Prepare dividend</Button>
    </PageHeader>

    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>

    <dl v-if="policy" class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">Operations started</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ policy.operations_started_on ? formatDate(policy.operations_started_on) : 'Not yet' }}</dd>
      </div>
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">Waiting period</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ policy.waiting_years }} years</dd>
      </div>
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">First dividend year</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ policy.first_dividend_year ?? '—' }}</dd>
      </div>
      <div class="bg-background px-3 py-2">
        <dt class="text-xs text-muted-foreground">Maximum rate</dt>
        <dd class="mt-0.5 font-semibold tabular-nums text-navy dark:text-white">{{ policy.maximum_rate }}% a year</dd>
      </div>
    </dl>
    <p v-if="policy?.minimum_holding_months" class="text-sm text-muted-foreground">Members must hold shares for {{ policy.minimum_holding_months }} months to qualify.</p>

    <DataPanel label="Dividends">
      <Table class="tabular-nums" :aria-busy="loading || undefined">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead>Year</TableHead>
            <TableHead>Product</TableHead>
            <TableHead class="text-right">Rate</TableHead>
            <TableHead class="text-right">Total</TableHead>
            <TableHead class="text-right">Members</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>AGM</TableHead>
            <TableHead><span class="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in dividends?.data ?? []" :key="item.id">
            <TableCell class="font-semibold text-navy dark:text-white">{{ item.financial_year }}</TableCell>
            <TableCell>{{ item.product?.name }}</TableCell>
            <TableCell class="text-right font-medium">{{ item.rate }}%</TableCell>
            <TableCell class="text-right font-medium">{{ formatMoney(item.total_amount) }}</TableCell>
            <TableCell class="text-right font-medium">{{ item.eligible_members }}</TableCell>
            <TableCell><StatusBadge :status="item.status" /></TableCell>
            <TableCell class="text-muted-foreground">{{ item.agm_reference ?? '—' }}</TableCell>
            <TableCell class="py-2.5 text-right"><Button variant="outline" size="xs" @click="show(item.id)">Open</Button></TableCell>
          </TableRow>
          <TableRow v-if="!loading && dividends && dividends.data.length === 0" class="hover:bg-transparent">
            <TableCell :colspan="8" class="py-14 text-center font-medium">No dividends yet</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </DataPanel>

    <section class="flex flex-col gap-3 pt-2">
      <div>
        <h2 class="text-section text-heading">Year-end appropriation</h2>
        <p class="mt-0.5 max-w-[75ch] text-sm text-muted-foreground">
          Before a dividend, each closed year's surplus goes {{ appropriations?.meta.reserve_fund_rate ?? '10.00' }}% to the Reserve Fund and up to
          {{ appropriations?.meta.share_transfer_fund_maximum_rate ?? '5.00' }}% of share capital to the Share Transfer Fund, at the rate UMRA sets.
          The Share Transfer Fund holds {{ formatMoney(appropriations?.meta.share_transfer_fund_balance) }} for buy-backs.
        </p>
      </div>

      <DataPanel label="Year-end appropriation">
        <form v-if="can('accounting.manage')" class="grid grid-cols-1 items-end gap-3 border-b border-border p-3 sm:grid-cols-2 lg:grid-cols-4" @submit.prevent="appropriate">
          <p v-if="appropriation.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2 lg:col-span-4">{{ appropriation.message.value }}</p>
          <FormField label="Financial year" :error="appropriation.error('financial_year')">
            <input v-model.number="appropriation.data.financial_year" type="number" min="2000" :max="lastYear" required />
          </FormField>
          <FormField label="Share Transfer Fund rate (%)" :error="appropriation.error('share_transfer_fund_rate')">
            <input v-model.number="appropriation.data.share_transfer_fund_rate" type="number" min="0" max="5" step="0.01" required />
          </FormField>
          <FormField label="AGM reference" :error="appropriation.error('agm_reference')">
            <input v-model="appropriation.data.agm_reference" maxlength="255" />
          </FormField>
          <Button type="submit" size="sm" class="justify-self-start" :disabled="appropriation.processing.value">Appropriate surplus</Button>
        </form>

        <Table class="tabular-nums">
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>Year</TableHead>
              <TableHead class="text-right">Surplus</TableHead>
              <TableHead class="text-right">Reserve Fund</TableHead>
              <TableHead class="text-right">Share Transfer Fund</TableHead>
              <TableHead class="text-right">Left for dividends</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in appropriations?.data ?? []" :key="row.id">
              <TableCell class="font-semibold text-navy dark:text-white">{{ row.financial_year }}</TableCell>
              <TableCell class="text-right font-medium">{{ formatMoney(row.surplus) }}</TableCell>
              <TableCell class="text-right font-medium">{{ formatMoney(row.reserve_fund_amount) }} <span class="font-normal text-muted-foreground">({{ row.reserve_fund_rate }}%)</span></TableCell>
              <TableCell class="text-right font-medium">{{ formatMoney(row.share_transfer_fund_amount) }} <span class="font-normal text-muted-foreground">({{ row.share_transfer_fund_rate }}%)</span></TableCell>
              <TableCell class="text-right font-medium">{{ formatMoney(row.distributable) }}</TableCell>
            </TableRow>
            <TableRow v-if="appropriations && appropriations.data.length === 0" class="hover:bg-transparent">
              <TableCell :colspan="5" class="py-10 text-center font-medium">No year has been appropriated yet</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DataPanel>
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
  </div>
</template>
