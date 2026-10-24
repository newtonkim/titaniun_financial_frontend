<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Download,
  FileCheck2,
  Landmark,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import type { Member } from '@/modules/members/types'
import { membersApi } from '@/modules/members/api'
import MemberFormDrawer from '@/modules/members/components/MemberFormDrawer.vue'
import LoanMemberPicker from '../components/LoanMemberPicker.vue'
import LoanSecurityFields from '../components/LoanSecurityFields.vue'
import { useLoanApplication } from '../composables/useLoanApplication'
import { applicationSteps } from '../application-policy'
import applicationWording from '../application-guarantee.json'
import { formatEnum, formatMoney } from '@/core/utils/format'
import type { LoanApplicationData, LoanChargeInput } from '../types'
import '../loan-workflow.css'
import '../loan-application.css'

const router = useRouter()
const {
  editingId,
  loading,
  loadingError,
  busy,
  message,
  errors,
  member,
  products,
  options,
  form,
  guarantorNames,
  product,
  preview,
  eligibility,
  checking,
  previewError,
  load,
  refresh,
  save,
} = useLoanApplication()
const stage = ref(0)
const registerOpen = ref(false)
const pendingClient = ref<Member | null>(null)
const checkingClient = ref(false)
const downloadingForm = ref(false)
const localError = ref('')
const formHeading = ref<HTMLElement>()
const accounts = ref<ChartOfAccount[]>([])
const charge = ref<LoanChargeInput>({
  name: 'Monitoring fee',
  amount: '',
  frequency: 'monthly',
  collection: 'repayment',
  chart_of_account_id: 0,
})
const business = computed(() => form.application_data.applicant_type === 'business')
const textFields = computed(() =>
  business.value
    ? [
        { key: 'display_name', label: 'Registered business name' },
        { key: 'business_registration_number', label: 'Registration / incorporation number' },
        { key: 'business_activity', label: 'Nature of business' },
        { key: 'signatory_name', label: 'Authorized signatory' },
        { key: 'signatory_title', label: 'Signatory designation' },
        { key: 'signatory_national_id', label: 'Signatory NIN' },
      ]
    : [
        { key: 'display_name', label: 'Full name' },
        { key: 'national_id', label: 'National identification number' },
        { key: 'employer', label: 'Employer / place of work' },
        { key: 'occupation', label: 'Occupation / profession' },
      ],
)
const applicant = computed(() => form.application_data as LoanApplicationData & Record<string, string | boolean>)
const chargeTotal = computed(() =>
  form.charges.reduce(
    (sum, item) => sum + Number(item.amount) * (item.frequency === 'monthly' ? Number(form.term || 0) : 1),
    0,
  ),
)
const upfront = computed(() =>
  form.charges.filter((item) => item.collection === 'upfront').reduce((sum, item) => sum + Number(item.amount), 0),
)
const totalRepayment = computed(() => (preview.value?.total_repayment ?? 0) + chargeTotal.value - upfront.value)
const completion = computed(() => Math.round(((stage.value + 1) / applicationSteps.length) * 100))
async function downloadForm() {
  if (downloadingForm.value) return
  downloadingForm.value = true
  localError.value = ''
  try {
    const { downloadApplicationForm } = await import('../application-pack')
    downloadApplicationForm({
      form,
      product: product.value,
      member: member.value,
      officerName: options.value.officers.find((officer) => officer.id === form.loan_officer_id)?.name,
      guarantorNames: guarantorNames.value,
      reference: editingId.value ? `Application #${editingId.value}` : undefined,
    })
  } catch (failure) {
    localError.value =
      failure instanceof Error ? failure.message : 'The application form could not be downloaded. Please try again.'
  } finally {
    downloadingForm.value = false
  }
}
watch(member, (value) => {
  if (!value || (editingId.value && form.application_data.display_name)) return
  Object.assign(form.application_data, {
    applicant_type: value.applicant_type ?? 'individual',
    employer: value.employer ?? '',
    occupation: value.occupation ?? '',
    district: value.district ?? '',
    business_registration_number: value.business_registration_number ?? '',
    business_activity: value.business_activity ?? '',
    signatory_name: value.signatory_name ?? '',
    signatory_title: value.signatory_title ?? '',
    signatory_national_id: value.signatory_national_id ?? '',
    display_name: value.name,
    national_id: value.national_id ?? '',
    date_of_birth: value.date_of_birth ?? '',
    phone: value.phone,
    email: value.email ?? '',
    address: value.address ?? '',
  })
})
watch(stage, async () => {
  localError.value = ''
  await nextTick()
  formHeading.value?.focus()
})
function next() {
  localError.value = ''
  if (
    stage.value === 0 &&
    (!member.value ||
      !form.application_data.display_name ||
      !form.application_data.address ||
      !form.application_data.district ||
      !form.application_data.phone ||
      textFields.value.some((field) => field.key !== 'employer' && !String(applicant.value[field.key] ?? '').trim()) ||
      (!business.value && !form.application_data.date_of_birth))
  )
    localError.value = 'Select an active client and complete their identity and contact details.'
  if (
    stage.value === 1 &&
    (!product.value || !form.loan_officer_id || !Number(form.principal) || !Number(form.term) || !form.purpose.trim())
  )
    localError.value = 'Choose a product, assign an officer, and complete the requested loan details.'
  if (stage.value === 2 && form.guarantors.length < 2)
    localError.value = 'Add the two savings-backed guarantors required for this application.'
  if (
    stage.value === 3 &&
    (!form.application_data.declaration_accepted || !form.application_data.declaration_name.trim())
  )
    localError.value = 'Record the applicant’s declaration and signatory name.'
  if (!localError.value) stage.value = Math.min(stage.value + 1, 4)
}
function addCharge() {
  if (!charge.value.name.trim() || !(Number(charge.value.amount) > 0) || !charge.value.chart_of_account_id) {
    localError.value = 'Enter the charge name, a positive amount, and its accounting account.'
    return
  }
  if (charge.value.frequency === 'monthly' && charge.value.collection === 'upfront') {
    localError.value = 'Monthly charges are collected with repayments.'
    return
  }
  form.charges.push({ ...charge.value, amount: Number(charge.value.amount).toFixed(2) })
  charge.value.amount = ''
  localError.value = ''
}
function registered(value: Member) {
  registerOpen.value = false
  if (value.status === 'active') member.value = value
  else pendingClient.value = value
}
async function checkClientApproval() {
  if (!pendingClient.value) return
  checkingClient.value = true
  localError.value = ''
  try {
    const value = await membersApi.show(pendingClient.value.id)
    if (value.status === 'active') {
      member.value = value
      pendingClient.value = null
    } else
      localError.value =
        'Client approval is still pending. An authorized staff member must complete it before submission.'
  } catch (failure) {
    localError.value = failure instanceof Error ? failure.message : 'Could not check client approval.'
  } finally {
    checkingClient.value = false
  }
}
onMounted(async () => {
  try {
    const result = await chartOfAccountsApi.list({ is_active: true })
    accounts.value = result.data.filter((item) => item.is_postable && ['income', 'liability'].includes(item.type))
  } catch {
    localError.value = 'Accounting accounts could not be loaded. Retry before adding charges.'
  }
})
</script>

<template>
  <div class="loan-workflow application-workspace">
    <header class="application-header">
      <div class="application-title">
        <button
          type="button"
          class="loan-icon-button"
          aria-label="Back to loans"
          @click="router.push({ name: 'loans.index' })"
        >
          <ArrowLeft :size="20" />
        </button>
        <div>
          <p class="application-caption">TITANIUM FINANCIAL · CREDIT OPERATIONS</p>
          <h1>{{ editingId ? 'Continue application' : 'New loan application' }}</h1>
          <p>One application. A clear path from client details to disbursement.</p>
        </div>
      </div>
      <div class="application-header-actions">
        <span class="application-state"
          ><Circle :size="8" fill="currentColor" /> {{ editingId ? 'Saved draft' : 'Draft application' }}</span
        >
        <button
          type="button"
          class="loan-button loan-button--outline"
          :disabled="loading || !!loadingError || busy || downloadingForm"
          :aria-busy="downloadingForm"
          @click="downloadForm"
        >
          <Download :size="16" aria-hidden="true" />{{ downloadingForm ? 'Preparing…' : 'Download form' }}
        </button>
      </div>
    </header>
    <div v-if="loading" class="application-skeleton" role="status" aria-label="Loading application">
      <div />
      <div />
      <div />
    </div>
    <div v-else-if="loadingError" class="loan-card" role="alert">
      <p>{{ loadingError }}</p>
      <button class="loan-button loan-button--outline" @click="load">Try again</button>
    </div>
    <template v-else>
      <nav class="application-progress" aria-label="Application steps">
        <button
          v-for="(label, index) in applicationSteps"
          :key="label"
          type="button"
          :class="{ active: stage === index, complete: stage > index }"
          :aria-current="stage === index ? 'step' : undefined"
          :disabled="index > stage || busy"
          @click="stage = index"
        >
          <span class="application-step-number"
            ><Check v-if="stage > index" :size="15" /><template v-else>{{ index + 1 }}</template></span
          ><span>{{ label }}</span>
        </button>
      </nav>
      <div class="application-grid">
        <main class="application-main">
          <section class="application-paper">
            <div class="application-section-heading">
              <div>
                <p class="application-caption">STEP {{ stage + 1 }} OF 5</p>
                <h2 ref="formHeading" tabindex="-1">
                  {{
                    [
                      'Who is applying?',
                      'Build the loan facility',
                      'Secure the facility',
                      'Applicant declaration',
                      'Review the application',
                    ][stage]
                  }}
                </h2>
                <p>
                  {{
                    [
                      'Reuse verified client details and complete the information required for this application.',
                      'Show every cost clearly before the application reaches appraisal.',
                      'Savings-backed guarantors and collateral remain linked to the application.',
                      'Record the declaration now. Signed documents are verified after approval.',
                      'Check the requested terms before sending this application for review.',
                    ][stage]
                  }}
                </p>
              </div>
              <component :is="[Landmark, Landmark, ShieldCheck, FileCheck2, CheckCircle2][stage]" :size="24" />
            </div>
            <div v-if="message || localError" class="application-alert" role="alert">
              {{ localError || message }}
            </div>
            <div v-if="pendingClient" class="application-info">
              <UserPlus :size="18" />
              <div>
                <p>
                  {{ pendingClient.name }} is registered and awaiting approval. Open their profile in another tab to
                  keep this application on screen.
                </p>
                <RouterLink
                  class="loan-link"
                  :to="{ name: 'members.show', params: { id: pendingClient.id } }"
                  target="_blank"
                  rel="noopener"
                  >Open client record</RouterLink
                >
                <button
                  type="button"
                  class="loan-button loan-button--quiet"
                  :disabled="checkingClient"
                  @click="checkClientApproval"
                >
                  {{ checkingClient ? 'Checking…' : 'Check approval' }}
                </button>
              </div>
            </div>
            <ul v-if="Object.keys(errors).length" class="application-errors" role="alert">
              <li v-for="(messages, key) in errors" :key="key">
                {{ formatEnum(String(key).replace('application_data.', '')) }}: {{ messages[0] }}
              </li>
            </ul>
            <fieldset :disabled="busy" class="application-fieldset">
              <template v-if="stage === 0">
                <div class="application-client-row">
                  <LoanMemberPicker v-model="member" label="Select client" /><button
                    class="loan-button loan-button--outline"
                    type="button"
                    @click="registerOpen = true"
                  >
                    <UserPlus :size="16" />Register client
                  </button>
                </div>
                <div class="application-segmented" aria-label="Applicant type">
                  <button
                    type="button"
                    :aria-pressed="!business"
                    :class="{ selected: !business }"
                    @click="form.application_data.applicant_type = 'individual'"
                  >
                    Individual applicant</button
                  ><button
                    type="button"
                    :aria-pressed="business"
                    :class="{ selected: business }"
                    @click="form.application_data.applicant_type = 'business'"
                  >
                    Business / company
                  </button>
                </div>
                <div class="loan-fields">
                  <label v-for="field in textFields" :key="field.key" :for="`app-${field.key}`"
                    >{{ field.label
                    }}<input :id="`app-${field.key}`" v-model="applicant[field.key]" autocomplete="off" /></label
                  ><label v-if="!business" for="app-dob"
                    >Date of birth<input
                      id="app-dob"
                      v-model="form.application_data.date_of_birth"
                      type="date" /></label
                  ><label for="app-phone"
                    >Primary telephone<input
                      id="app-phone"
                      v-model="form.application_data.phone"
                      type="tel"
                      autocomplete="tel" /></label
                  ><label for="app-email"
                    >Email address<input
                      id="app-email"
                      v-model="form.application_data.email"
                      type="email"
                      autocomplete="email" /></label
                  ><label for="app-district"
                    >Town / division / district<input
                      id="app-district"
                      v-model="form.application_data.district" /></label
                  ><label class="loan-span-all" for="app-address"
                    >Residential / business address<textarea
                      id="app-address"
                      v-model="form.application_data.address"
                      rows="2"
                    />
                  </label>
                </div>
              </template>
              <template v-else-if="stage === 1">
                <div class="loan-fields">
                  <label for="app-product"
                    >Loan product<select id="app-product" v-model.number="form.loan_product_id">
                      <option :value="null" disabled>Select a product</option>
                      <option v-for="item in products" :key="item.id" :value="item.id">
                        {{ item.name }} · {{ item.interest_rate }}%
                        {{ item.interest_period === 'per_month' ? 'monthly' : 'yearly' }}
                      </option>
                    </select></label
                  ><label for="app-officer"
                    >Assigned loan officer<select id="app-officer" v-model.number="form.loan_officer_id">
                      <option :value="null" disabled>Select officer</option>
                      <option v-for="officer in options.officers" :key="officer.id" :value="officer.id">
                        {{ officer.name }}
                      </option>
                    </select></label
                  ><label for="app-principal"
                    >Amount requested · UGX<input
                      id="app-principal"
                      v-model="form.principal"
                      type="number"
                      step="0.01"
                      :min="product?.min_amount ?? '0.01'"
                      :max="product?.max_amount ?? undefined"
                    /><small v-if="product"
                      >{{ formatMoney(product.min_amount) }} –
                      {{ product.max_amount === null ? 'No upper limit' : formatMoney(product.max_amount) }}</small
                    ></label
                  ><label for="app-term"
                    >Duration · months<input
                      id="app-term"
                      v-model.number="form.term"
                      type="number"
                      :min="product?.min_term ?? 1"
                      :max="product?.max_term" /></label
                  ><label for="app-method"
                    >Interest method<select id="app-method" v-model="form.interest_method">
                      <option value="flat">Flat · original principal</option>
                      <option value="reducing_balance">Reducing balance</option>
                    </select></label
                  ><label for="app-source"
                    >Repayment source<input
                      id="app-source"
                      v-model="form.repayment_source"
                      placeholder="e.g. Business trading income" /></label
                  ><label class="loan-span-all" for="app-purpose"
                    >Purpose of the loan<textarea id="app-purpose" v-model="form.purpose" rows="2" />
                  </label>
                </div>
                <div class="application-divider">
                  <h3>Additional charges</h3>
                  <span>Itemized separately from interest</span>
                </div>
                <div v-if="form.charges.length" class="loan-table-wrap">
                  <table class="loan-table">
                    <thead>
                      <tr>
                        <th>Charge</th>
                        <th>Amount</th>
                        <th>Frequency</th>
                        <th>Collection</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in form.charges" :key="index">
                        <td>{{ item.name }}</td>
                        <td>{{ formatMoney(item.amount) }}</td>
                        <td>{{ formatEnum(item.frequency) }}</td>
                        <td>{{ formatEnum(item.collection) }}</td>
                        <td>
                          <button
                            type="button"
                            class="loan-icon-button"
                            :aria-label="`Remove ${item.name}`"
                            @click="form.charges.splice(index, 1)"
                          >
                            <Trash2 :size="15" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="application-charge-editor loan-fields">
                  <label>Charge name<input v-model="charge.name" /></label
                  ><label>Amount · UGX<input v-model="charge.amount" type="number" min="0.01" step="0.01" /></label
                  ><label
                    >Frequency<select v-model="charge.frequency">
                      <option value="once">One time</option>
                      <option value="monthly">Monthly</option>
                    </select></label
                  ><label
                    >Collection<select v-model="charge.collection">
                      <option value="repayment">With repayments</option>
                      <option value="upfront" :disabled="charge.frequency === 'monthly'">Deduct at disbursement</option>
                    </select></label
                  ><label class="loan-span-all"
                    >Accounting account<select v-model.number="charge.chart_of_account_id">
                      <option :value="0" disabled>Select fee income or recovery account</option>
                      <option v-for="account in accounts" :key="account.id" :value="account.id">
                        {{ account.code }} · {{ account.name }}
                      </option>
                    </select></label
                  >
                </div>
                <button class="loan-button loan-button--outline" type="button" @click="addCharge">
                  <Plus :size="16" />Add charge
                </button>
              </template>
              <template v-else-if="stage === 2"
                ><div class="application-info">
                  <ShieldCheck :size="18" />
                  <p>
                    Guarantors must be active members with enough unpledged savings to cover their guarantee. Their
                    consent is recorded before appraisal.
                  </p>
                </div>
                <LoanSecurityFields
                  v-model:collaterals="form.collaterals"
                  v-model:guarantors="form.guarantors"
                  v-model:guarantor-names="guarantorNames"
                  :product="product"
                  :amount="Number(form.principal || 0)"
                  :borrower-id="member?.id ?? null"
                />
                <div class="application-divider"><h3>Commission recipient</h3></div>
                <label class="loan-field-label"
                  >Who introduced this client?<select v-model="form.commission_member_id">
                    <option :value="null">Assigned loan officer</option>
                    <option v-for="item in form.guarantors" :key="item.member_id" :value="item.member_id">
                      {{ guarantorNames[item.member_id] ?? item.member_id }} · referring guarantor
                    </option>
                  </select></label
                >
                <p class="loan-hint">
                  {{ product?.commission_rate ?? 20 }}% of collected interest is recorded as commission, held until full
                  clearance, and paid at an eligible quarter-end.
                </p></template
              >
              <template v-else-if="stage === 3"
                ><div class="application-declaration">
                  <FileCheck2 :size="24" />
                  <h3>Applicant declaration and acknowledgement</h3>
                  <p class="application-declaration-text">{{ applicationWording.declaration }}</p>
                  <p>
                    The approved loan terms, itemized charges, repayment schedule and guarantee obligations will be
                    presented for signature before funds are released.
                  </p>
                  <label class="application-checkbox"
                    ><input v-model="form.application_data.declaration_accepted" type="checkbox" /><span
                      >The applicant has reviewed the information and acknowledged this declaration.</span
                    ></label
                  ><label class="loan-field-label"
                    >Applicant / authorized signatory name<input v-model="form.application_data.declaration_name"
                  /></label>
                </div>
                <div class="application-info">
                  <FileCheck2 :size="18" />
                  <p>
                    After approval: finance reviews pricing, the agreement pack is generated, signed copies are
                    uploaded, and staff verify every required signature.
                  </p>
                </div></template
              >
              <template v-else
                ><dl class="application-review">
                  <div>
                    <dt>Applicant</dt>
                    <dd>
                      {{ form.application_data.display_name
                      }}<small
                        >{{ business ? 'Business / company' : 'Individual' }} · {{ member?.member_number }}</small
                      >
                    </dd>
                  </div>
                  <div>
                    <dt>Requested facility</dt>
                    <dd>
                      UGX {{ formatMoney(form.principal)
                      }}<small
                        >{{ product?.name }} · {{ form.term }} months · {{ formatEnum(form.interest_method) }}</small
                      >
                    </dd>
                  </div>
                  <div>
                    <dt>Guarantors and security</dt>
                    <dd>{{ form.guarantors.length }} guarantors · {{ form.collaterals.length }} collateral items</dd>
                  </div>
                  <div>
                    <dt>Additional charges</dt>
                    <dd>
                      UGX {{ formatMoney(chargeTotal) }}<small>{{ form.charges.length }} itemized charges</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Declaration</dt>
                    <dd>
                      {{ form.application_data.declaration_accepted ? 'Acknowledged' : 'Incomplete'
                      }}<small>{{ form.application_data.declaration_name }}</small>
                    </dd>
                  </div>
                </dl>
                <div class="application-checks">
                  <h3>Eligibility checks</h3>
                  <p v-if="checking">Checking the current product limits and security…</p>
                  <div v-for="check in eligibility?.checks" :key="check.key">
                    <CheckCircle2 v-if="check.passed" :size="17" /><Circle v-else :size="17" /><span
                      >{{ check.label }}<small v-if="!check.passed">{{ check.reason }}</small></span
                    >
                  </div>
                  <button v-if="!eligibility && !checking" type="button" class="loan-link" @click="refresh">
                    Refresh eligibility checks
                  </button>
                </div></template
              >
            </fieldset>
            <footer class="application-footer">
              <button type="button" class="loan-button loan-button--quiet" :disabled="busy" @click="save(false)">
                <Save :size="16" />Save draft
              </button>
              <div>
                <button
                  v-if="stage > 0"
                  type="button"
                  class="loan-button loan-button--outline"
                  :disabled="busy"
                  @click="stage--"
                >
                  Back</button
                ><button
                  v-if="stage < 4"
                  type="button"
                  class="loan-button loan-button--primary"
                  :disabled="busy"
                  @click="next"
                >
                  Continue<ArrowRight :size="16" /></button
                ><button
                  v-else
                  type="button"
                  class="loan-button loan-button--primary"
                  :disabled="busy || checking || !eligibility?.eligible"
                  @click="save(true)"
                >
                  {{ busy ? 'Submitting…' : 'Submit application' }}<ArrowRight :size="16" />
                </button>
              </div>
            </footer>
          </section>
        </main>
        <aside class="application-aside">
          <section class="application-summary">
            <div class="application-summary-heading"><Landmark :size="20" /><span>Facility summary</span></div>
            <p class="application-summary-amount">
              {{ Number(form.principal) ? formatMoney(form.principal) : '0.00' }}<span>UGX requested</span>
            </p>
            <dl>
              <div>
                <dt>Product rate</dt>
                <dd>
                  {{
                    product
                      ? `${product.interest_rate}% ${product.interest_period === 'per_month' ? 'monthly' : 'yearly'}`
                      : 'Choose a product'
                  }}
                </dd>
              </div>
              <div>
                <dt>Calculation</dt>
                <dd>{{ formatEnum(form.interest_method) }}</dd>
              </div>
              <div>
                <dt>Estimated interest</dt>
                <dd>{{ formatMoney(preview?.total_interest) }}</dd>
              </div>
              <div>
                <dt>Additional charges</dt>
                <dd>{{ formatMoney(chargeTotal) }}</dd>
              </div>
              <div>
                <dt>Processing fee</dt>
                <dd>{{ formatMoney(preview?.processing_fee) }}</dd>
              </div>
              <div>
                <dt>Net disbursement</dt>
                <dd>{{ preview ? formatMoney((preview.net_disbursement ?? 0) - upfront) : '—' }}</dd>
              </div>
              <div class="application-summary-total">
                <dt>Total repayment</dt>
                <dd>{{ preview ? formatMoney(totalRepayment) : '—' }}</dd>
              </div>
            </dl>
            <p v-if="checking" role="status">Updating your estimate…</p>
            <p v-else-if="previewError" role="alert">{{ previewError }}</p>
            <p v-else>Estimates use the selected product. Final terms require committee approval and finance review.</p>
          </section>
          <section class="application-aside-note">
            <ShieldCheck :size="20" />
            <h3>Complete once. Keep a clear record.</h3>
            <p>
              Client details, costs, security, documents and approvals stay together throughout this loan’s lifecycle.
            </p>
            <div class="application-completion"><span :style="{ width: `${completion}%` }" /></div>
            <small>{{ completion }}% through application steps</small>
          </section>
        </aside>
      </div>
    </template>
    <MemberFormDrawer v-model:open="registerOpen" :member-id="null" @saved="registered" />
  </div>
</template>
