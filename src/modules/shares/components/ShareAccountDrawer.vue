<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
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

const account = ref<ShareAccount | null>(null)
const certificates = ref<ShareCertificate[]>([])
const nominees = ref<ShareNominee[]>([])
const paymentAccounts = ref<ChartOfAccount[]>([])
const busy = ref(false)
const error = ref('')
const notice = ref('')
const errors = ref<Record<string, string[]>>({})
const instalment = reactive({ amount: 0, reference: '', payment_account_id: null as number | null })

const current = computed(() => certificates.value.find((certificate) => certificate.cancelled_at === null) ?? null)
const outdated = computed(() => current.value !== null && current.value.number_of_shares !== account.value?.shares_held)
const nomineeTotal = computed(() => nominees.value.reduce((sum, nominee) => sum + Number(nominee.percentage || 0), 0))

async function run<T>(action: () => Promise<T>, success?: (result: T) => string): Promise<T | undefined> {
  busy.value = true
  error.value = ''
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
  if (!account.value) return
  const id = account.value.id
  const payment = await run(
    () => shareAccountsApi.payInstalment(id, { ...instalment, reference: instalment.reference || null }),
    (result) => (result.shares_issued > 0
      ? `Issued ${result.shares_issued} shares. ${formatMoney(result.balance_after)} is waiting toward the next share.`
      : `${formatMoney(result.balance_after)} is held toward the next share.`),
  )
  if (!payment) return
  instalment.amount = 0
  instalment.reference = ''
  await load(id)
  emit('changed')
}

async function issueCertificate() {
  if (!account.value) return
  const id = account.value.id
  const certificate = await run(() => shareAccountsApi.issueCertificate(id), (result) => `Certificate ${result.certificate_number} issued.`)
  if (certificate) certificates.value = await shareAccountsApi.certificates(id)
}

async function saveNominees() {
  if (!account.value) return
  const memberId = account.value.member_id
  const saved = await run(() => shareNomineesApi.save(memberId, nominees.value), () => 'Nominees saved.')
  if (saved) nominees.value = saved
}

watch(
  () => [open.value, props.accountId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      notice.value = ''
      void load(id)
    }
  },
)
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="account ? `Share account ${account.account_number}` : 'Share account'"
    :description="account?.member ? account.member.name : undefined"
    :show-footer="false"
    width="w-full sm:max-w-[720px]"
  >
    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
    <p v-if="notice" class="muted" role="status">{{ notice }}</p>

    <template v-if="account">
      <dl class="account-summary">
        <div><dt>Shares held</dt><dd>{{ account.shares_held }}</dd></div>
        <div><dt>Value</dt><dd>{{ formatMoney(account.share_value) }}</dd></div>
        <div><dt>Toward next share</dt><dd>{{ formatMoney(account.subscription_balance) }}</dd></div>
        <div><dt>Minimum holding</dt><dd>{{ account.product?.minimum_shares }} shares</dd></div>
      </dl>

      <form v-if="can('shares.manage') && account.status === 'active'" class="account-section" @submit.prevent="payInstalment">
        <h2>Pay an instalment</h2>
        <p class="muted">Instalments are held as a share subscription. Whole shares at {{ formatMoney(account.product?.nominal_price) }} are issued as soon as they are covered.</p>
        <div class="form-grid">
          <FormField label="Amount (UGX)" :error="errors.amount?.[0]">
            <input id="instalment-amount" v-model.number="instalment.amount" type="number" min="1" step="0.01" required />
          </FormField>
          <FormField label="Paid into" :error="errors.payment_account_id?.[0]">
            <select id="instalment-account" v-model="instalment.payment_account_id">
              <option v-for="item in paymentAccounts" :key="item.id" :value="item.id">{{ item.code }} · {{ item.name }}</option>
            </select>
          </FormField>
          <FormField label="Reference" :error="errors.reference?.[0]">
            <input id="instalment-reference" v-model="instalment.reference" maxlength="100" />
          </FormField>
        </div>
        <div class="form-actions"><button type="submit" class="btn btn--primary" :disabled="busy || instalment.amount <= 0">Record instalment</button></div>
      </form>

      <section class="account-section">
        <div class="section-head">
          <h2>Certificates</h2>
          <div class="row-actions">
            <button v-if="current" type="button" class="btn btn--small" @click="printShareCertificate(current)">Print current</button>
            <button v-if="can('shares.manage')" type="button" class="btn btn--small btn--primary" :disabled="busy || !account.shares_held" @click="issueCertificate">
              {{ current ? 'Reissue' : 'Issue certificate' }}
            </button>
          </div>
        </div>
        <p v-if="outdated" class="muted">The holding has changed since {{ current?.certificate_number }} was issued. Reissue it to certify {{ account.shares_held }} shares.</p>
        <div v-if="certificates.length" class="table-wrap">
          <table>
            <thead><tr><th>Certificate</th><th class="num">Shares</th><th class="num">Value</th><th>Issued</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="certificate in certificates" :key="certificate.id">
                <td>{{ certificate.certificate_number }}</td>
                <td class="num">{{ certificate.number_of_shares }}</td>
                <td class="num">{{ formatMoney(certificate.value) }}</td>
                <td>{{ formatDate(certificate.issued_on) }}</td>
                <td><span class="badge" :class="certificate.cancelled_at ? '' : 'badge--active'">{{ certificate.cancelled_at ? 'Cancelled' : 'Current' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted">No certificate has been issued for this account.</p>
      </section>

      <form class="account-section" @submit.prevent="saveNominees">
        <div class="section-head">
          <h2>Nominees</h2>
          <button v-if="can('members.manage')" type="button" class="btn btn--small" :disabled="nominees.length >= 5" @click="nominees.push({ name: '', relationship: '', phone: null, national_id: null, percentage: nominees.length ? 0 : 100 })">
            Add nominee
          </button>
        </div>
        <p class="muted">Nominees receive the member's shares and unpaid dividends on the member's death. Their shares must total 100%.</p>
        <fieldset :disabled="!can('members.manage') || busy" class="nominees">
          <div v-for="(nominee, index) in nominees" :key="nominee.id ?? `new-${index}`" class="nominee">
            <FormField label="Name" :error="errors[`nominees.${index}.name`]?.[0]"><input :id="`nominee-name-${index}`" v-model="nominee.name" required maxlength="255" /></FormField>
            <FormField label="Relationship" :error="errors[`nominees.${index}.relationship`]?.[0]"><input :id="`nominee-relationship-${index}`" v-model="nominee.relationship" required maxlength="100" /></FormField>
            <FormField label="Phone"><input :id="`nominee-phone-${index}`" v-model="nominee.phone" maxlength="30" /></FormField>
            <FormField label="Share (%)" :error="errors[`nominees.${index}.percentage`]?.[0]"><input :id="`nominee-percentage-${index}`" v-model.number="nominee.percentage" type="number" min="0.01" max="100" step="0.01" required /></FormField>
            <button v-if="can('members.manage')" type="button" class="btn btn--small btn--danger" @click="nominees.splice(index, 1)">Remove</button>
          </div>
        </fieldset>
        <p v-if="errors.nominees" class="field__error">{{ errors.nominees[0] }}</p>
        <div v-if="can('members.manage')" class="form-actions">
          <span class="muted">Total {{ nomineeTotal }}%</span>
          <button type="submit" class="btn btn--primary" :disabled="busy">Save nominees</button>
        </div>
      </form>
    </template>
    <p v-else-if="busy" class="muted" role="status">Loading share account…</p>
  </AppDrawer>
</template>

<style scoped>
.account-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: 0.75rem; margin: 0 0 0.5rem; }
.account-summary dt { font-size: 0.8rem; color: var(--muted); }
.account-summary dd { margin: 0.2rem 0 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.account-section { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; margin-top: 1rem; border-top: 1px solid var(--border); }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.nominees { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.nominee { display: grid; grid-template-columns: 1.4fr 1fr 1fr 6rem auto; gap: 0.5rem; align-items: end; }
@media (max-width: 640px) { .nominee { grid-template-columns: 1fr 1fr; } }
</style>
