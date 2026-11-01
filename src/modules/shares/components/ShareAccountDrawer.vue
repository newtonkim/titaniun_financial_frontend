<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { ApiError } from '@/core/api/http'
import { formatDate, formatMoney } from '@/core/utils/format'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import { useAuth } from '@/modules/auth/store'
import { shareAccountsApi, shareNomineesApi } from '../api'
import { printShareCertificate } from '../certificate-print'
import type { ShareAccount, ShareCertificate, ShareNominee } from '../types'

/** A share account's holding, with instalments, certificates and the member's nominees. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ accountId: number | null }>()
const emit = defineEmits<{ changed: [] }>()
const { can } = useAuth()

const MAX_NOMINEES = 5

const account = ref<ShareAccount | null>(null)
const certificates = ref<ShareCertificate[]>([])
const nominees = ref<ShareNominee[]>([])
const paymentAccounts = ref<ChartOfAccount[]>([])
const busy = ref(false)
const error = ref('')
const notice = ref('')
const errors = ref<Record<string, string[]>>({})
const instalment = reactive({ amount: null as number | null, reference: '', payment_account_id: null as number | null })

const current = computed(() => certificates.value.find((certificate) => certificate.cancelled_at === null) ?? null)
const outdated = computed(() => current.value !== null && current.value.number_of_shares !== account.value?.shares_held)
const canPay = computed(() => can('shares.manage') && account.value?.status === 'active')

const sharesHeld = computed(() => account.value?.shares_held ?? 0)
const minimum = computed(() => account.value?.product?.minimum_shares ?? 0)
const minimumProgress = computed(() => (minimum.value > 0 ? Math.min(100, (sharesHeld.value / minimum.value) * 100) : 100))
const sharesShort = computed(() => Math.max(0, minimum.value - sharesHeld.value))

/** Money math in cents, so 0.1 + 0.2 never decides whether a share is issued. */
const cents = (value: unknown) => Math.round(Number(value || 0) * 100)
const nominalCents = computed(() => cents(account.value?.product?.nominal_price))
const balanceCents = computed(() => cents(account.value?.subscription_balance))
const nextShareProgress = computed(() => (nominalCents.value > 0 ? (balanceCents.value / nominalCents.value) * 100 : 0))

/** What the amount being typed will do: whole shares issued, and what carries toward the next one. */
const preview = computed(() => {
  const amount = cents(instalment.amount)
  if (amount <= 0 || nominalCents.value <= 0) return null
  const pool = balanceCents.value + amount
  const shares = Math.floor(pool / nominalCents.value)
  return { shares, carried: (pool - shares * nominalCents.value) / 100 }
})

const nomineeTotal = computed(() => Math.round(nominees.value.reduce((sum, nominee) => sum + Number(nominee.percentage || 0), 0) * 100) / 100)
const allocationComplete = computed(() => nominees.value.length === 0 || nomineeTotal.value === 100)
const canEditNominees = computed(() => can('members.manage'))

async function run<T>(action: () => Promise<T>, success?: (result: T) => string): Promise<T | undefined> {
  busy.value = true
  error.value = ''
  notice.value = ''
  errors.value = {}
  try {
    const result = await action()
    if (success) notice.value = success(result)
    return result
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The request failed.'
    errors.value = failure instanceof ApiError ? failure.errors : {}
  } finally {
    busy.value = false
  }
}

async function load(id: number) {
  await run(async () => {
    account.value = await shareAccountsApi.show(id)
    const [certificateList, nomineeList, chart] = await Promise.all([
      shareAccountsApi.certificates(id),
      shareNomineesApi.list(account.value.member_id),
      chartOfAccountsApi.list({ is_active: true }),
    ])
    certificates.value = certificateList
    nominees.value = nomineeList
    paymentAccounts.value = chart.data.filter((item) => item.is_postable && item.type === 'asset' && ['Cash', 'Bank'].includes(item.subtype ?? ''))
    instalment.payment_account_id = account.value.product?.cash_account_id ?? paymentAccounts.value[0]?.id ?? null
  })
}

async function payInstalment() {
  if (!account.value || !instalment.amount) return
  const id = account.value.id
  const payment = await run(
    () => shareAccountsApi.payInstalment(id, { ...instalment, amount: instalment.amount ?? 0, reference: instalment.reference || null }),
    (result) => (result.shares_issued > 0
      ? `Issued ${result.shares_issued} ${result.shares_issued === 1 ? 'share' : 'shares'}. ${formatMoney(result.balance_after)} carries toward the next share.`
      : `Instalment recorded. ${formatMoney(result.balance_after)} is now held toward the next share.`),
  )
  if (!payment) return
  const message = notice.value
  instalment.amount = null
  instalment.reference = ''
  await load(id)
  notice.value = message
  emit('changed')
}

async function issueCertificate() {
  if (!account.value) return
  const id = account.value.id
  const certificate = await run(() => shareAccountsApi.issueCertificate(id), (result) => `Certificate ${result.certificate_number} issued.`)
  if (certificate) certificates.value = await shareAccountsApi.certificates(id)
}

function addNominee() {
  nominees.value.push({ name: '', relationship: '', phone: null, national_id: null, percentage: nominees.value.length ? Math.max(0, 100 - nomineeTotal.value) : 100, signed_on: '', first_witness: '', second_witness: '' })
}

async function saveNominees() {
  if (!account.value) return
  const memberId = account.value.member_id
  const saved = await run(() => shareNomineesApi.save(memberId, nominees.value), () => 'Nominees saved.')
  if (saved) nominees.value = saved
}

/** Server errors for one nominee row, in field order. */
function rowErrors(index: number): string[] {
  return ['name', 'relationship', 'phone', 'percentage', 'signed_on', 'first_witness', 'second_witness'].flatMap((field) => errors.value[`nominees.${index}.${field}`] ?? [])
}

watch(
  () => [open.value, props.accountId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      notice.value = ''
      error.value = ''
      void load(id)
    }
  },
)
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="account?.member?.name ?? 'Share account'"
    :description="account ? `${account.product?.name ?? 'Share'} account ${account.account_number}` : undefined"
    :show-footer="false"
    width="w-full sm:max-w-[720px]"
  >
    <div class="share-account">
      <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>

      <div v-if="!account && busy" class="skeletons" aria-busy="true" aria-label="Loading share account">
        <span class="skeleton skeleton--hero" />
        <span class="skeleton" />
        <span class="skeleton" />
      </div>

      <template v-if="account">
        <section class="block holding" aria-label="Holding">
          <div class="holding__top">
            <p class="holding__shares">
              <span class="holding__count">{{ sharesHeld.toLocaleString() }}</span>
              {{ sharesHeld === 1 ? 'share' : 'shares' }}
            </p>
            <StatusBadge :status="account.status" />
          </div>
          <p class="holding__value">Worth {{ formatMoney(account.share_value) }} at {{ formatMoney(account.product?.nominal_price) }} a share</p>

          <div v-if="minimum > 0" class="meter-row">
            <div class="meter" :class="{ 'meter--met': sharesShort === 0 }" role="meter" :aria-valuenow="sharesHeld" aria-valuemin="0" :aria-valuemax="minimum" aria-label="Progress to minimum holding">
              <span class="meter__fill" :style="{ width: `${minimumProgress}%` }" />
            </div>
            <p class="meter-row__label">
              <template v-if="sharesShort > 0"><strong>{{ sharesHeld }} of {{ minimum }}</strong> required. {{ sharesShort }} more to reach the minimum holding.</template>
              <template v-else><strong>Minimum holding met</strong> ({{ minimum }} shares).</template>
            </p>
          </div>

          <div class="meter-row">
            <div class="meter meter--quiet" role="meter" :aria-valuenow="balanceCents / 100" aria-valuemin="0" :aria-valuemax="nominalCents / 100" aria-label="Paid toward the next share">
              <span class="meter__fill" :style="{ width: `${nextShareProgress}%` }" />
            </div>
            <p class="meter-row__label"><strong>{{ formatMoney(account.subscription_balance) }}</strong> of {{ formatMoney(account.product?.nominal_price) }} paid toward the next share.</p>
          </div>
        </section>

        <form v-if="canPay" class="block" @submit.prevent="payInstalment">
          <header class="block__head">
            <div>
              <h3 class="block__title">Pay an instalment</h3>
              <p class="block__lede">Payments build up toward whole shares, and each share is issued the moment it is fully paid.</p>
            </div>
          </header>

          <div class="pay-grid">
            <label class="field">
              <span class="field__label">Amount</span>
              <span class="money" :class="{ 'field--invalid': errors.amount }">
                <span class="money__unit">UGX</span>
                <input id="instalment-amount" v-model.number="instalment.amount" type="number" min="1" step="0.01" inputmode="decimal" placeholder="0.00" required />
              </span>
              <span v-if="errors.amount" class="field__error">{{ errors.amount[0] }}</span>
            </label>
            <label class="field">
              <span class="field__label">Paid into</span>
              <select id="instalment-account" v-model="instalment.payment_account_id">
                <option v-for="item in paymentAccounts" :key="item.id" :value="item.id">{{ item.name }} ({{ item.code }})</option>
              </select>
              <span v-if="errors.payment_account_id" class="field__error">{{ errors.payment_account_id[0] }}</span>
            </label>
            <label class="field pay-grid__wide">
              <span class="field__label">Reference <span class="field__optional">optional</span></span>
              <input id="instalment-reference" v-model="instalment.reference" maxlength="100" placeholder="Receipt or mobile money transaction ID" />
              <span v-if="errors.reference" class="field__error">{{ errors.reference[0] }}</span>
            </label>
          </div>

          <footer class="block__foot">
            <p class="preview" aria-live="polite">
              <template v-if="preview && preview.shares > 0">
                Issues <strong>{{ preview.shares }} {{ preview.shares === 1 ? 'share' : 'shares' }}</strong><template v-if="preview.carried > 0">, with {{ formatMoney(preview.carried) }} carried toward the next</template>.
              </template>
              <template v-else-if="preview">
                No share yet. {{ formatMoney(preview.carried) }} will be held toward the next one.
              </template>
            </p>
            <button type="submit" class="btn btn--primary" :disabled="busy || !instalment.amount || instalment.amount <= 0">
              <span v-if="busy" class="spinner" aria-hidden="true" />
              Record instalment
            </button>
          </footer>
        </form>

        <section class="block">
          <header class="block__head">
            <div>
              <h3 class="block__title">Certificates</h3>
              <p class="block__lede">The current certificate proves the member's holding. Reissuing cancels the previous one.</p>
            </div>
            <div class="block__actions">
              <button v-if="current" type="button" class="btn" @click="printShareCertificate(current)">Print current</button>
              <button v-if="can('shares.manage')" type="button" class="btn btn--primary" :disabled="busy || !sharesHeld" @click="issueCertificate">
                {{ current ? 'Reissue' : 'Issue certificate' }}
              </button>
            </div>
          </header>

          <p v-if="outdated" class="warning">
            {{ current?.certificate_number }} certifies {{ current?.number_of_shares }} shares, but the member now holds {{ sharesHeld }}. Reissue it so the certificate matches.
          </p>

          <div v-if="certificates.length" class="table-wrap">
            <table>
              <thead><tr><th>Certificate</th><th class="num">Shares</th><th class="num">Value</th><th>Issued</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="certificate in certificates" :key="certificate.id" :class="{ 'is-cancelled': certificate.cancelled_at }">
                  <td class="cert-number">{{ certificate.certificate_number }}</td>
                  <td class="num">{{ certificate.number_of_shares }}</td>
                  <td class="num">{{ formatMoney(certificate.value) }}</td>
                  <td>{{ formatDate(certificate.issued_on) }}</td>
                  <td><span class="badge" :class="certificate.cancelled_at ? '' : 'badge--active'">{{ certificate.cancelled_at ? 'Cancelled' : 'Current' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-note">No certificate yet. Issue one once the member holds at least one share.</p>
        </section>

        <form class="block" @submit.prevent="saveNominees">
          <header class="block__head">
            <div>
              <h3 class="block__title">Nominees</h3>
              <p class="block__lede">Who receives the member's shares and unpaid dividends on the member's death. Shares must add up to 100%.</p>
            </div>
            <div v-if="canEditNominees" class="block__actions">
              <button type="button" class="btn" :disabled="busy || nominees.length >= MAX_NOMINEES" @click="addNominee">Add nominee</button>
            </div>
          </header>

          <p v-if="!nominees.length" class="empty-note">
            No nominees recorded.<template v-if="canEditNominees"> Add up to {{ MAX_NOMINEES }} people and split the holding between them.</template>
          </p>

          <fieldset v-else :disabled="!canEditNominees || busy" class="nominees">
            <legend class="sr-only">Nominees</legend>
            <div class="nominee nominee--head" aria-hidden="true">
              <span>Name</span><span>Relationship</span><span>Phone</span><span class="num">Share</span><span />
            </div>
            <div v-for="(nominee, index) in nominees" :key="nominee.id ?? `new-${index}`" class="nominee-row">
              <div class="nominee">
                <input v-model="nominee.name" :aria-label="`Nominee ${index + 1} name`" placeholder="Full name" required maxlength="255" />
                <input v-model="nominee.relationship" :aria-label="`Nominee ${index + 1} relationship`" placeholder="e.g. Spouse" required maxlength="100" />
                <input v-model="nominee.phone" :aria-label="`Nominee ${index + 1} phone`" placeholder="Phone" maxlength="30" inputmode="tel" />
                <span class="percent">
                  <input v-model.number="nominee.percentage" :aria-label="`Nominee ${index + 1} share in percent`" type="number" min="0.01" max="100" step="0.01" required />
                  <span class="percent__unit">%</span>
                </span>
                <button v-if="canEditNominees" type="button" class="btn btn--icon remove" :aria-label="`Remove nominee ${index + 1}`" title="Remove" @click="nominees.splice(index, 1)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input v-model="nominee.signed_on" :aria-label="`Nominee ${index + 1} date signed`" type="date" title="Date the member signed" required />
                <input v-model="nominee.first_witness" :aria-label="`Nominee ${index + 1} first witness`" placeholder="First witness" required maxlength="255" />
                <input v-model="nominee.second_witness" :aria-label="`Nominee ${index + 1} second witness`" placeholder="Second witness" required maxlength="255" />
              </div>
              <p v-for="message in rowErrors(index)" :key="message" class="field__error">{{ message }}</p>
            </div>
          </fieldset>

          <p v-if="errors.nominees" class="field__error">{{ errors.nominees[0] }}</p>

          <footer v-if="canEditNominees && (nominees.length || errors.nominees)" class="block__foot">
            <div class="allocation">
              <div class="meter" :class="allocationComplete ? 'meter--met' : 'meter--warn'">
                <span class="meter__fill" :style="{ width: `${Math.min(100, nomineeTotal)}%` }" />
              </div>
              <p class="allocation__label" aria-live="polite">
                <strong>{{ nomineeTotal }}%</strong> allocated.
                <template v-if="nomineeTotal < 100"> Assign {{ Math.round((100 - nomineeTotal) * 100) / 100 }}% more.</template>
                <template v-else-if="nomineeTotal > 100"> Remove {{ Math.round((nomineeTotal - 100) * 100) / 100 }}%.</template>
              </p>
            </div>
            <button type="submit" class="btn btn--primary" :disabled="busy || !allocationComplete">Save nominees</button>
          </footer>
        </form>
      </template>
    </div>
  </AppDrawer>
</template>

<style scoped>
.share-account {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-block: 0.25rem 1rem;
  font-size: 0.9rem;
}

.share-account .alert { margin: 0; }

.notice,
.warning {
  margin: 0;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius);
  line-height: 1.45;
}

.notice {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  color: var(--success);
}

.warning {
  background: color-mix(in srgb, var(--warning) 11%, var(--surface));
  color: var(--warning);
}

/* Sections */
.block {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.block__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem 1rem;
}

.block__head > div:first-child { flex: 1 1 18rem; }

.block__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--heading);
}

.block__lede {
  max-width: 60ch;
  margin-top: 0.2rem;
  color: var(--muted);
  line-height: 1.45;
}

.block__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.block__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.block__foot > .btn { margin-left: auto; }

/* Holding */
.holding { gap: 0.85rem; }

.holding__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.holding__shares {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--muted);
}

.holding__count {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--heading);
}

.holding__value {
  margin-top: -0.35rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.meter-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.meter-row__label,
.allocation__label {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.meter-row__label strong,
.allocation__label strong {
  color: var(--text);
  font-weight: 600;
}

.meter {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-sunken);
  box-shadow: inset 0 0 0 1px var(--border);
}

.meter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 240ms var(--ease-out);
}

.meter--quiet .meter__fill { background: var(--navy); }
.meter--met .meter__fill { background: var(--success); }
.meter--warn .meter__fill { background: var(--warning); }

:root[data-theme='dark'] .meter--quiet .meter__fill { background: #8b95c9; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .meter--quiet .meter__fill { background: #8b95c9; }
}

/* Instalment form */
.pay-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
}

.pay-grid__wide { grid-column: 1 / -1; }

.field__optional {
  margin-left: 0.25rem;
  font-weight: 400;
  color: var(--muted);
}

.pay-grid :is(input, select) {
  width: 100%;
  height: 2.6rem;
  border-radius: var(--radius);
}

.money {
  position: relative;
  display: block;
}

.money__unit {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.money input {
  padding-left: 3.1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.preview {
  flex: 1 1 16rem;
  min-height: 1.4em;
  color: var(--muted);
}

.preview strong { color: var(--heading); }

/* Certificates */
.block table { width: 100%; }
.block th:not(.num) { text-align: left; }
.block .table-wrap thead th { padding-block: 0.6rem; }
.block .table-wrap td { padding-block: 0.7rem; }
.cert-number { font-weight: 600; color: var(--heading); }
.is-cancelled td { color: var(--muted); }
.is-cancelled .cert-number { font-weight: 500; color: var(--muted); text-decoration: line-through; }

.empty-note {
  padding: 1rem;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  text-align: center;
}

/* Nominees */
.nominees {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.nominee {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.1fr) minmax(0, 1.1fr) 5.5rem 2.25rem;
  gap: 0.5rem;
  align-items: center;
}

.nominee--head {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
}

.nominee input {
  width: 100%;
  height: 2.4rem;
  border-radius: var(--radius);
}

.percent { position: relative; display: block; }

.percent input,
.money input {
  appearance: textfield;
  -moz-appearance: textfield;
}

.percent input::-webkit-inner-spin-button,
.percent input::-webkit-outer-spin-button,
.money input::-webkit-inner-spin-button,
.money input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.percent input {
  padding-right: 1.75rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.percent__unit {
  position: absolute;
  top: 50%;
  right: 0.6rem;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.remove { color: var(--muted); }
.remove:not(:disabled):hover { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); }

.nominee-row .field__error { margin-top: 0.25rem; }

.allocation {
  display: flex;
  flex: 1 1 16rem;
  flex-direction: column;
  gap: 0.4rem;
  max-width: 22rem;
}

/* Loading */
.skeletons { display: flex; flex-direction: column; gap: 1rem; }

.skeleton {
  display: block;
  height: 9rem;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--surface-sunken), var(--border), var(--surface-sunken)) 0 0 / 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.skeleton--hero { height: 11rem; }

@keyframes shimmer { to { background-position: -200% 0; } }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 560px) {
  .pay-grid { grid-template-columns: minmax(0, 1fr); }
  .nominee--head { display: none; }
  .nominee { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .nominee input:first-child { grid-column: 1 / -1; }
  .nominee-row { padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
  .meter__fill { transition: none; }
}
</style>
