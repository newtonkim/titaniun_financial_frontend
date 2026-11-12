<script setup lang="ts">
import { nextTick, computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Download,
  FileText,
  HandCoins,
  Pencil,
  Printer,
  RefreshCw,
  ShieldCheck,
  Upload,
  UsersRound,
} from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { letterheadApi, PAYMENT_METHODS, printReceipt, receiptNumber } from '@/modules/accounting/receipts'
import { useAuth } from '@/modules/auth/store'
import { loansApi } from '../api'
import { INVOICE_STATUS, invoiceNumber, loanInvoicesApi, printLoanInvoice, printLoanStatement, type LoanInvoice } from '../invoices'
import LoanExecutionPanel from '../components/LoanExecutionPanel.vue'
import '../loan-application.css'
import LoanCommissionLedger from '../components/LoanCommissionLedger.vue'
import LoanPreviewCard from '../components/LoanPreviewCard.vue'
import type { Loan, LoanAction, LoanRepayment, LoanStatus } from '../types'
import '../loan-workflow.css'

const route = useRoute()
const router = useRouter()
const loan = ref<Loan | null>(null)
const pageRoot = ref<HTMLElement>()
const noticeElement = ref<HTMLElement>()
const repayments = ref<LoanRepayment[]>([])
const invoices = ref<LoanInvoice[]>([])
const lastReceipt = ref<{ id: number; number: number } | null>(null)
const printError = ref('')
const { can } = useAuth()
const paymentPage = ref(1)
const paymentLastPage = ref(1)
const loading = ref(true)
const loadError = ref('')
const busy = ref(false)
const message = ref('')
const noticeError = ref(false)
const errors = ref<Record<string, string[]>>({})
const tab = ref('overview')
const selectedAction = ref<LoanAction | ''>('')
/** Release conditions still open. Disbursement is refused until there are none, so the form says so first. */
const openConditions = computed(() => (loan.value?.execution_checklist ?? []).filter((item) => !item.complete))
const disbursementBlocked = computed(() => selectedAction.value === 'disburse' && openConditions.value.length > 0)
const consentId = ref<number | null>(null)
const consentDecision = ref('accepted')
const consentEvidence = ref('')
const documentTitle = ref('')
const documentFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const localToday = new Date().toLocaleDateString('en-CA')
const actionForm = reactive({
  notes: '',
  recommended_amount: '',
  recommended_term: 1,
  recommended_interest_rate: '',
  recommended_interest_method: 'flat',
  risk_rating: 'low',
  decision: 'approve',
  disbursed_at: localToday,
  disbursement_method: 'bank_transfer',
  disbursement_reference: '',
  amount: '',
  paid_at: localToday,
  reference: '',
  payment_method: 'cash',
  principal_paid: '',
  interest_paid: '',
})
const labels: Partial<Record<LoanAction, string>> = {
  submit: 'Submit for review',
  'take-review': 'Start appraisal',
  'resume-review': 'Resume appraisal',
  'request-documents': 'Request documents',
  return: 'Return for correction',
  appraise: 'Complete officer appraisal',
  recommend: 'Recommend to committee',
  vote: 'Record committee vote',
  disburse: 'Disburse loan',
  reject: 'Reject application',
  cancel: 'Cancel application',
  reopen: 'Reopen as draft',
  repay: 'Record repayment',
}
const actions = computed(() =>
  loan.value?.uses_workflow
    ? (loan.value.available_actions ?? [])
    : loan.value?.status === 'disbursed'
      ? ['repay' as LoanAction]
      : [],
)
const formActions = computed(() =>
  actions.value.filter((action) => !['edit', 'documents', 'consent'].includes(action)),
)
const needsNotes = computed(() =>
  ['request-documents', 'return', 'reject', 'cancel', 'recommend'].includes(selectedAction.value),
)
const pipeline = [
  'Application',
  'Guarantor consent',
  'Officer appraisal',
  'Manager review',
  'Committee',
  'Disbursement',
  'Repayment',
]
const ranks: Partial<Record<LoanStatus, number>> = {
  draft: 0,
  returned_for_correction: 0,
  awaiting_guarantors: 1,
  submitted: 2,
  under_review: 2,
  awaiting_documents: 2,
  officer_recommended: 3,
  committee_voting: 4,
  approved: 5,
  disbursed: 6,
  closed: 6,
}
const outstanding = computed(
  () =>
    Number(loan.value?.outstanding_principal ?? loan.value?.principal ?? 0) +
    Number(loan.value?.outstanding_interest ?? 0) +
    Number(loan.value?.outstanding_charges ?? 0),
)
const votesFor = computed(() => loan.value?.votes?.filter((vote) => vote.decision === 'approve').length ?? 0)
const votesAgainst = computed(
  () => loan.value?.votes?.filter((vote) => vote.decision === 'decline').length ?? 0,
)
let sequence = 0

async function loadPayments(page = 1): Promise<void> {
  const result = await loansApi.repayments(Number(route.params.id), page)
  repayments.value = result.data
  paymentPage.value = result.meta.current_page
  paymentLastPage.value = result.meta.last_page
}

async function loadInvoices(): Promise<void> {
  invoices.value = (await loanInvoicesApi.list({ loan_id: Number(route.params.id), per_page: 100 })).data
}

/** Print a document, keeping any failure on screen instead of losing it in the console. */
async function printing(task: () => Promise<void>): Promise<void> {
  printError.value = ''
  try {
    await task()
  } catch (failure) {
    printError.value = failure instanceof Error ? failure.message : 'The document could not be printed.'
  }
}

async function issueInvoice(): Promise<void> {
  if (!loan.value) return
  await printing(async () => {
    const invoice = await loanInvoicesApi.issue((loan.value as Loan).id)
    await loadInvoices()
    await printLoanInvoice(invoice.id)
  })
}

const printStatement = () =>
  printing(async () => {
    if (loan.value) printLoanStatement(loan.value, repayments.value, await letterheadApi.show())
  })
async function load(): Promise<void> {
  const current = ++sequence
  loading.value = true
  loadError.value = ''
  try {
    const result = await loansApi.show(Number(route.params.id))
    if (current !== sequence) return
    loan.value = result
    await loadPayments()
    void loadInvoices().catch(() => undefined)
  } catch (error) {
    if (current === sequence)
      loadError.value = error instanceof Error ? error.message : 'Could not load this loan.'
  } finally {
    if (current === sequence) loading.value = false
  }
}
watch(loading, async (value) => {
  if (!value) {
    await nextTick()
    pageRoot.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
})
watch(message, async (value) => {
  if (value) {
    await nextTick()
    noticeElement.value?.focus({ preventScroll: true })
    noticeElement.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
})
watch(loan, (current) => {
  if (!current) return
  selectedAction.value = formActions.value[0] ?? ''
  Object.assign(actionForm, {
    notes: '',
    recommended_amount: current.recommended_amount ?? current.principal,
    recommended_term: current.recommended_term ?? current.term,
    recommended_interest_rate: (
      Number(current.recommended_interest_rate ?? current.interest_rate) /
      (current.product?.interest_period === 'per_month' ? 12 : 1)
    ).toFixed(2),
    recommended_interest_method:
      current.recommended_interest_method ??
      current.interest_method ??
      current.product?.interest_method ??
      'flat',
    risk_rating: current.risk_rating ?? 'low',
    disbursement_method: current.application_type === 'continuing' ? 'cash' : 'bank_transfer',
    disbursed_at:
      current.application_type === 'continuing' ? (current.agreement_date ?? localToday) : localToday,
  })
  consentId.value = current.guarantors?.find((item) => item.status === 'requested')?.id ?? null
})
async function clearSavedNotice(): Promise<void> {
  if (route.query.saved || route.query.warning)
    await router.replace({
      path: route.path,
      query: { ...route.query, saved: undefined, warning: undefined },
    })
}

function failure(error: unknown): void {
  noticeError.value = true
  errors.value = error instanceof ApiError ? error.errors : {}
  message.value = error instanceof Error ? error.message : 'The action could not be completed.'
}
async function perform(): Promise<void> {
  if (!loan.value || busy.value || !selectedAction.value) return
  busy.value = true
  message.value = ''
  noticeError.value = false
  errors.value = {}
  try {
    const action = selectedAction.value
    if (action === 'repay') {
      const repayment = await loansApi.recordRepayment(
        loan.value.id,
        loan.value.uses_workflow
          ? {
              amount: String(actionForm.amount),
              paid_at: actionForm.paid_at,
              reference: actionForm.reference.trim(),
              payment_method: actionForm.payment_method,
            }
          : {
              principal_paid: String(actionForm.principal_paid),
              interest_paid: String(actionForm.interest_paid),
              paid_at: actionForm.paid_at,
              reference: actionForm.reference.trim(),
              payment_method: actionForm.payment_method,
            },
      )
      lastReceipt.value = repayment.receipt ?? null
      void loadInvoices()
      loan.value = await loansApi.show(loan.value.id)
      await loadPayments()
      Object.assign(actionForm, {
        amount: '',
        reference: '',
        principal_paid: '',
        interest_paid: '',
      })
      tab.value = 'repayments'
    } else {
      const payload =
        action === 'appraise'
          ? {
              recommended_amount: String(actionForm.recommended_amount),
              recommended_term: Number(actionForm.recommended_term),
              recommended_interest_rate: (
                Number(actionForm.recommended_interest_rate) *
                (loan.value.product?.interest_period === 'per_month' ? 12 : 1)
              ).toFixed(2),
              recommended_interest_method: actionForm.recommended_interest_method,
              risk_rating: actionForm.risk_rating,
              appraisal_notes: actionForm.notes.trim(),
            }
          : action === 'vote'
            ? { decision: actionForm.decision, comments: actionForm.notes.trim() }
            : action === 'disburse'
              ? {
                  disbursed_at: actionForm.disbursed_at,
                  disbursement_method: actionForm.disbursement_method,
                  disbursement_reference: actionForm.disbursement_reference.trim(),
                }
              : { notes: actionForm.notes.trim() }
      loan.value = await loansApi.workflow(loan.value.id, action, payload)
    }
    await clearSavedNotice()
    message.value = `${labels[action] ?? 'Action'} completed.`
  } catch (error) {
    failure(error)
  } finally {
    busy.value = false
  }
}
async function recordConsent(): Promise<void> {
  if (!loan.value || busy.value || !consentId.value) return
  busy.value = true
  message.value = ''
  noticeError.value = false
  errors.value = {}
  try {
    loan.value = await loansApi.workflow(loan.value.id, 'consent', {
      guarantor_id: consentId.value,
      decision: consentDecision.value,
      consent_evidence: consentEvidence.value.trim(),
    })
    consentEvidence.value = ''
    await clearSavedNotice()
    message.value = 'Guarantor response recorded.'
  } catch (error) {
    failure(error)
  } finally {
    busy.value = false
  }
}
async function uploadDocument(): Promise<void> {
  if (!loan.value || busy.value || !documentFile.value) return
  busy.value = true
  message.value = ''
  noticeError.value = false
  errors.value = {}
  try {
    const file = documentFile.value
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a document smaller than 5 MB.')
    loan.value = await loansApi.uploadDocument(loan.value.id, documentTitle.value.trim(), file)
    documentTitle.value = ''
    documentFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    await clearSavedNotice()
    message.value = 'Document uploaded.'
  } catch (error) {
    failure(error)
  } finally {
    busy.value = false
  }
}
async function downloadDocument(id: number, filename: string): Promise<void> {
  if (!loan.value) return
  try {
    await loansApi.downloadDocument(loan.value.id, id, filename)
  } catch (error) {
    failure(error)
  }
}
async function changePaymentPage(page: number): Promise<void> {
  if (busy.value) return
  busy.value = true
  try {
    await loadPayments(page)
  } catch (error) {
    failure(error)
  } finally {
    busy.value = false
  }
}
watch(() => route.params.id, load)
onMounted(load)
onBeforeUnmount(() => {
  ++sequence
})
</script>

<template>
  <div ref="pageRoot" class="loan-workflow">
    <div v-if="loading" class="loan-card loan-loading" role="status">
      <span class="spinner" />Loading loan application…
    </div>
    <section v-else-if="loadError" class="loan-card loan-empty" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="loan-button loan-button--outline" @click="load">Try again</button
      ><RouterLink class="loan-button loan-button--quiet" :to="{ name: 'loans.index' }"
        >Back to loans</RouterLink
      >
    </section>
    <template v-else-if="loan">
      <header class="loan-page-header">
        <div class="loan-page-title">
          <RouterLink class="loan-back-button" :to="{ name: 'loans.index' }" aria-label="Back to loans"
            ><ArrowLeft :size="18" /></RouterLink
          ><span class="loan-title-icon"><HandCoins :size="23" /></span>
          <div>
            <h1>{{ loan.loan_number }}</h1>
            <p>{{ loan.borrower?.name }} · {{ loan.product?.name }}</p>
          </div>
        </div>
        <div class="loan-inline-actions">
          <span class="loan-status">{{ formatEnum(loan.status) }}</span
          ><RouterLink
            v-if="actions.includes('edit')"
            class="loan-button loan-button--outline"
            :to="{ name: 'loans.edit', params: { id: loan.id } }"
            ><Pencil :size="15" />Edit application</RouterLink
          >
        </div>
      </header>
      <p v-if="route.query.warning" class="loan-alert loan-alert--error" role="alert">
        {{ route.query.warning }}
      </p>
      <p v-else-if="route.query.saved && !message" class="loan-alert" role="status">
        <Check :size="17" />{{
          route.query.saved === 'draft'
            ? 'Application saved as draft. Add supporting documents or submit it when ready.'
            : 'Application saved and submitted. Guarantor consent is required before appraisal when guarantees are included.'
        }}
      </p>
      <p v-if="printError" class="loan-alert loan-alert--error" role="alert">{{ printError }}</p>
      <div
        v-if="message"
        ref="noticeElement"
        tabindex="-1"
        class="loan-alert"
        :class="{ 'loan-alert--error': noticeError }"
        :role="noticeError ? 'alert' : 'status'"
      >
        <p>{{ message }}</p>
        <p v-if="lastReceipt && !noticeError" style="margin-top: 6px">
          Receipt No. {{ receiptNumber(lastReceipt.number) }} issued.
          <button type="button" class="loan-link" @click="printing(() => printReceipt(lastReceipt!.id))">Print receipt</button>
        </p>
        <ul v-if="Object.keys(errors).length">
          <li v-for="(messages, field) in errors" :key="field">
            {{ formatEnum(String(field)) }}: {{ messages[0] }}
          </li>
        </ul>
      </div>
      <div v-if="loan.uses_workflow" class="loan-pipeline loan-card" aria-label="Loan lifecycle">
        <span
          v-for="(stage, index) in pipeline"
          :key="stage"
          :class="{ 'is-active': ranks[loan.status] === index }"
          :aria-current="ranks[loan.status] === index ? 'step' : undefined"
          ><Check v-if="(ranks[loan.status] ?? -1) > index" :size="14" /><span v-else>{{ index + 1 }}.</span
          >{{ stage }}<ArrowRight v-if="index < pipeline.length - 1" :size="12" aria-hidden="true"
        /></span>
      </div>
      <dl class="loan-kpis">
        <div class="loan-card">
          <dt>Loan principal</dt>
          <dd>{{ formatMoney(loan.principal) }}</dd>
        </div>
        <div class="loan-card">
          <dt>
            {{
              ['disbursed', 'closed'].includes(loan.status)
                ? 'Outstanding balance'
                : 'Estimated total repayment'
            }}
          </dt>
          <dd>
            {{
              formatMoney(
                ['disbursed', 'closed'].includes(loan.status)
                  ? outstanding
                  : loan.repayment_preview?.total_repayment,
              )
            }}
          </dd>
        </div>
        <div class="loan-card">
          <dt>Installment</dt>
          <dd>{{ formatMoney(loan.repayment_preview?.installment_amount) }}</dd>
        </div>
        <div class="loan-card">
          <dt>Borrower interest rate</dt>
          <dd>
            {{
              (Number(loan.interest_rate) / (loan.product?.interest_period === 'per_month' ? 12 : 1)).toFixed(
                2,
              )
            }}%
            {{ loan.product?.interest_period === 'per_month' ? 'per month' : 'per year' }}
          </dd>
        </div>
      </dl>
      <div class="loan-columns">
        <div class="loan-main">
          <TabsRoot v-model="tab">
            <TabsList class="loan-tabs" aria-label="Loan information"
              ><TabsTrigger v-if="loan.application_version >= 2" value="execution"
                >Application pack</TabsTrigger
              ><TabsTrigger value="overview">Overview</TabsTrigger
              ><TabsTrigger value="security">Security & consent</TabsTrigger
              ><TabsTrigger value="documents"
                >Documents
                <span v-if="loan.documents?.length">({{ loan.documents.length }})</span></TabsTrigger
              ><TabsTrigger value="schedule">Schedule</TabsTrigger
              ><TabsTrigger value="repayments">Repayments</TabsTrigger
              ><TabsTrigger v-if="['disbursed', 'closed'].includes(loan.status)" value="invoices">Invoices ({{ invoices.length }})</TabsTrigger
              ><TabsTrigger value="commissions">Commissions</TabsTrigger
              ><TabsTrigger value="activity">Activity</TabsTrigger></TabsList
            >
            <TabsContent v-if="loan.application_version >= 2" value="execution"
              ><LoanExecutionPanel :loan="loan" @updated="loan = $event"
            /></TabsContent>
            <TabsContent value="overview"
              ><section class="loan-card">
                <div class="loan-card-heading">
                  <FileText :size="18" />
                  <h2>Application details</h2>
                </div>
                <dl class="loan-review-list">
                  <div>
                    <dt>Application type</dt>
                    <dd>
                      {{
                        loan.application_type === 'continuing'
                          ? 'Continuing / existing member'
                          : 'Standard application'
                      }}
                    </dd>
                  </div>
                  <template v-if="loan.application_type === 'continuing'">
                    <div>
                      <dt>Agreement / cash disbursement date</dt>
                      <dd>{{ formatDate(loan.agreement_date) }}</dd>
                    </div>
                    <div>
                      <dt>First repayment date</dt>
                      <dd>{{ formatDate(loan.first_repayment_date) }}</dd>
                    </div>
                  </template>
                  <div>
                    <dt>Member</dt>
                    <dd>
                      <RouterLink
                        class="loan-link"
                        :to="{ name: 'members.show', params: { id: loan.member_id } }"
                        >{{ loan.borrower?.name }}</RouterLink
                      ><small>{{ loan.borrower?.member_number }}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Loan product</dt>
                    <dd>{{ loan.product?.name }}</dd>
                  </div>
                  <div>
                    <dt>Loan officer</dt>
                    <dd>{{ loan.officer?.name || 'Not assigned' }}</dd>
                  </div>
                  <div>
                    <dt>Interest method</dt>
                    <dd>{{ formatEnum(loan.interest_method ?? loan.product?.interest_method) }}</dd>
                  </div>
                  <div>
                    <dt>Commission recipient</dt>
                    <dd>
                      {{ loan.commission_member?.name ?? loan.officer?.name ?? 'Not assigned' }}
                    </dd>
                  </div>
                  <div>
                    <dt>Interest distribution</dt>
                    <dd>
                      {{ 100 - Number(loan.commission_rate) }}% company / {{ loan.commission_rate }}%
                      commission
                    </dd>
                  </div>
                  <div>
                    <dt>Term</dt>
                    <dd>
                      {{ loan.term }} {{ formatEnum(loan.product?.repayment_frequency) }} repayment periods
                    </dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{{ loan.purpose || 'Not provided' }}</dd>
                  </div>
                  <div>
                    <dt>Repayment source</dt>
                    <dd>{{ loan.repayment_source || 'Not provided' }}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{{ formatDate(loan.created_at) }}</dd>
                  </div>
                  <div v-if="loan.approved_at">
                    <dt>Approved</dt>
                    <dd>{{ formatDate(loan.approved_at) }}</dd>
                  </div>
                  <div v-if="loan.disbursed_at">
                    <dt>Disbursed</dt>
                    <dd>
                      {{ formatDate(loan.disbursed_at)
                      }}<small
                        >{{ formatEnum(loan.disbursement_method) }} · {{ loan.disbursement_reference }}</small
                      >
                    </dd>
                  </div>
                  <div v-if="loan.net_disbursed_amount">
                    <dt>Net disbursed</dt>
                    <dd>
                      {{ formatMoney(loan.net_disbursed_amount)
                      }}<small>Processing fee: {{ formatMoney(loan.processing_fee_amount) }}</small>
                    </dd>
                  </div>
                  <div v-if="loan.maturity_date">
                    <dt>Maturity date</dt>
                    <dd>{{ formatDate(loan.maturity_date) }}</dd>
                  </div>
                </dl>
              </section>
              <section v-if="loan.appraisal_notes" class="loan-card" style="margin-top: 22px">
                <div class="loan-card-heading">
                  <ShieldCheck :size="18" />
                  <h2>Officer appraisal</h2>
                </div>
                <dl class="loan-summary-list">
                  <div>
                    <dt>Recommended amount</dt>
                    <dd>{{ formatMoney(loan.recommended_amount) }}</dd>
                  </div>
                  <div>
                    <dt>Recommended term</dt>
                    <dd>{{ loan.recommended_term }} periods</dd>
                  </div>
                  <div>
                    <dt>Recommended annual rate</dt>
                    <dd>
                      {{
                        (
                          Number(loan.recommended_interest_rate) /
                          (loan.product?.interest_period === 'per_month' ? 12 : 1)
                        ).toFixed(2)
                      }}%
                      {{ loan.product?.interest_period === 'per_month' ? 'per month' : 'per year' }}
                    </dd>
                  </div>
                  <div>
                    <dt>Risk rating</dt>
                    <dd>{{ formatEnum(loan.risk_rating) }}</dd>
                  </div>
                </dl>
                <p class="loan-hint">{{ loan.appraisal_notes }}</p>
              </section></TabsContent
            >
            <TabsContent value="security"
              ><section class="loan-card">
                <div class="loan-card-heading">
                  <ShieldCheck :size="18" />
                  <h2>Collateral</h2>
                </div>
                <ul v-if="loan.collaterals?.length" class="loan-security-list">
                  <li v-for="item in loan.collaterals" :key="item.id">
                    <ShieldCheck :size="18" />
                    <div>
                      <strong>{{ item.asset_type }} · {{ formatMoney(item.estimated_value) }}</strong>
                      <p>{{ item.description }}</p>
                      <p v-if="item.notes">{{ item.notes }}</p>
                    </div>
                  </li>
                </ul>
                <p v-else class="loan-empty">No collateral recorded.</p>
              </section>
              <section class="loan-card" style="margin-top: 22px">
                <div class="loan-card-heading">
                  <UsersRound :size="18" />
                  <h2>Guarantors & consent</h2>
                </div>
                <ul v-if="loan.guarantors?.length" class="loan-security-list">
                  <li v-for="item in loan.guarantors" :key="item.id">
                    <UsersRound :size="18" />
                    <div>
                      <strong>{{ item.member.name }} · {{ formatMoney(item.guaranteed_amount) }}</strong>
                      <p>{{ item.member.member_number }} · {{ formatEnum(item.status) }}</p>
                      <p v-if="item.consent_evidence">{{ item.consent_evidence }}</p>
                      <p v-if="item.consented_at">Response recorded {{ formatDate(item.consented_at) }}</p>
                    </div>
                  </li>
                </ul>
                <p v-else class="loan-empty">No guarantors recorded.</p>
                <form
                  v-if="
                    actions.includes('consent') &&
                    loan.guarantors?.some((item) => item.status === 'requested')
                  "
                  class="loan-action-form loan-subform"
                  @submit.prevent="recordConsent"
                >
                  <h3>Record verified guarantor consent</h3>
                  <p class="loan-hint">
                    Record the guarantor’s response after verifying their identity and consent. Accepting a
                    guarantee reserves that amount from their available savings.
                  </p>
                  <fieldset class="loan-form-reset" :disabled="busy">
                    <div class="loan-fields loan-fields--single">
                      <label for="consent-guarantor"
                        >Guarantor<select id="consent-guarantor" v-model="consentId" required>
                          <option
                            v-for="item in loan.guarantors.filter((item) => item.status === 'requested')"
                            :key="item.id"
                            :value="item.id"
                          >
                            {{ item.member.name }}
                          </option>
                        </select></label
                      ><label for="consent-decision"
                        >Response<select id="consent-decision" v-model="consentDecision">
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select></label
                      ><label for="consent-evidence"
                        >Consent evidence<textarea
                          id="consent-evidence"
                          v-model="consentEvidence"
                          rows="3"
                          required
                          maxlength="2000"
                          placeholder="e.g. Signed form reference, verification method, and response"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      class="loan-button loan-button--primary"
                      style="margin-top: 16px"
                      :disabled="busy"
                    >
                      {{ busy ? 'Recording…' : 'Record response' }}
                    </button>
                  </fieldset>
                </form>
              </section></TabsContent
            >
            <TabsContent value="documents"
              ><section class="loan-card">
                <div class="loan-card-heading">
                  <FileText :size="18" />
                  <h2>Supporting documents</h2>
                </div>
                <ul v-if="loan.documents?.length" class="loan-security-list">
                  <li v-for="item in loan.documents" :key="item.id">
                    <FileText :size="18" />
                    <div>
                      <strong>{{ item.title }}</strong>
                      <p>
                        {{ item.original_name }} · {{ Math.ceil(item.size / 1024) }} KB ·
                        {{ formatDate(item.created_at) }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="loan-icon-button"
                      :aria-label="`Download ${item.title}`"
                      @click="downloadDocument(item.id, item.original_name)"
                    >
                      <Download :size="17" />
                    </button>
                  </li>
                </ul>
                <p v-else class="loan-empty">No supporting documents uploaded yet.</p>
                <form
                  v-if="actions.includes('documents')"
                  class="loan-action-form loan-subform"
                  @submit.prevent="uploadDocument"
                >
                  <h3>Upload a document</h3>
                  <label class="loan-field-label" for="document-title"
                    >Document title<input
                      id="document-title"
                      v-model="documentTitle"
                      required
                      maxlength="255"
                      placeholder="e.g. Proof of business income"
                      :disabled="busy" /></label
                  ><label class="loan-field-label" for="document-file"
                    >File<input
                      id="document-file"
                      ref="fileInput"
                      class="loan-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      required
                      :disabled="busy"
                      @change="documentFile = ($event.target as HTMLInputElement).files?.[0] ?? null"
                  /></label>
                  <p class="loan-hint">
                    PDF, JPG, PNG, or WebP, up to 5 MB. Documents require an authenticated staff session to
                    download.
                  </p>
                  <button
                    type="submit"
                    class="loan-button loan-button--primary"
                    :disabled="busy || !documentFile"
                  >
                    <Upload :size="16" />{{ busy ? 'Uploading…' : 'Upload document' }}
                  </button>
                </form>
              </section></TabsContent
            >
            <TabsContent value="schedule"
              ><section class="loan-card">
                <div class="loan-card-heading">
                  <Clock3 :size="18" />
                  <h2>Repayment schedule</h2>
                  <button v-if="loan.installments?.length" type="button" class="loan-button loan-button--outline" style="margin-left: auto" @click="printStatement">
                    <Printer :size="15" />Print loan statement
                  </button>
                </div>
                <template v-if="loan.installments?.length"
                  ><div class="loan-table-wrap">
                    <table class="loan-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Due date</th>
                          <th class="num">Principal</th>
                          <th class="num">Interest</th>
                          <th class="num">Fees</th>
                          <th class="num">Paid</th>
                          <th class="num">Remaining</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in loan.installments" :key="item.id">
                          <td>{{ item.period }}</td>
                          <td>{{ formatDate(item.due_date) }}</td>
                          <td class="num">{{ formatMoney(item.principal) }}</td>
                          <td class="num">{{ formatMoney(item.interest) }}</td>
                          <td class="num">{{ formatMoney(item.fees) }}</td>
                          <td class="num">
                            {{
                              formatMoney(
                                Number(item.principal_paid) +
                                  Number(item.interest_paid) +
                                  Number(item.fees_paid ?? 0),
                              )
                            }}
                          </td>
                          <td class="num">
                            {{
                              formatMoney(
                                Number(item.principal) +
                                  Number(item.interest) +
                                  Number(item.fees ?? 0) -
                                  Number(item.principal_paid) -
                                  Number(item.interest_paid) -
                                  Number(item.fees_paid ?? 0),
                              )
                            }}
                          </td>
                          <td>
                            {{
                              Number(item.principal) + Number(item.interest) + Number(item.fees ?? 0) <=
                              Number(item.principal_paid) +
                                Number(item.interest_paid) +
                                Number(item.fees_paid ?? 0) +
                                0.001
                                ? 'Paid'
                                : item.due_date.slice(0, 10) < localToday
                                  ? 'Overdue'
                                  : 'Scheduled'
                            }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div></template
                ><template v-else
                  ><p class="loan-hint">
                    {{
                      loan.application_type === 'continuing'
                        ? 'Proposed dated schedule. Repayment tracking starts when funds are disbursed.'
                        : 'The final dated schedule is generated when funds are disbursed.'
                    }}
                  </p>
                  <div v-if="loan.repayment_preview" class="loan-table-wrap" style="margin-top: 17px">
                    <table class="loan-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th v-if="loan.application_type === 'continuing'">Due date</th>
                          <th class="num">Principal</th>
                          <th class="num">Interest</th>
                          <th class="num">Installment</th>
                          <th class="num">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in loan.repayment_preview.schedule_preview" :key="item.period">
                          <td>{{ item.period }}</td>
                          <td v-if="loan.application_type === 'continuing'">
                            {{ item.due_date ? formatDate(item.due_date) : 'Not set' }}
                          </td>
                          <td class="num">{{ formatMoney(item.principal) }}</td>
                          <td class="num">{{ formatMoney(item.interest) }}</td>
                          <td class="num">{{ formatMoney(item.installment) }}</td>
                          <td class="num">{{ formatMoney(item.balance) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div></template
                >
              </section></TabsContent
            >
            <TabsContent value="repayments"
              ><section class="loan-card">
                <div class="loan-card-heading">
                  <HandCoins :size="18" />
                  <h2>Recorded repayments</h2>
                </div>
                <div v-if="repayments.length" class="loan-table-wrap">
                  <table class="loan-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Receipt</th>
                        <th>Reference</th>
                        <th class="num">Amount</th>
                        <th class="num">Principal</th>
                        <th class="num">Interest</th>
                        <th class="num">Fees</th>
                        <th class="num">Company share</th>
                        <th class="num">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in repayments" :key="item.id">
                        <td>{{ formatDate(item.paid_at) }}</td>
                        <td>
                          <button v-if="item.receipt" type="button" class="loan-link" :title="`Print receipt ${receiptNumber(item.receipt.number)}`" @click="printing(() => printReceipt(item.receipt!.id))">
                            No. {{ receiptNumber(item.receipt.number) }}
                          </button>
                          <span v-else>—</span>
                        </td>
                        <td>{{ item.reference || '—' }}</td>
                        <td class="num">{{ formatMoney(item.amount) }}</td>
                        <td class="num">{{ formatMoney(item.principal_paid) }}</td>
                        <td class="num">{{ formatMoney(item.interest_paid) }}</td>
                        <td class="num">{{ formatMoney(item.fees_paid) }}</td>
                        <td class="num">
                          {{ item.company_interest === null ? '—' : formatMoney(item.company_interest) }}
                        </td>
                        <td class="num">
                          {{ item.commission_amount === null ? '—' : formatMoney(item.commission_amount) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="loan-empty">No repayments have been recorded.</p>
                <div v-if="paymentLastPage > 1" class="loan-navigation" style="margin-top: 18px">
                  <button
                    type="button"
                    class="loan-button loan-button--outline"
                    :disabled="busy || paymentPage <= 1"
                    @click="changePaymentPage(paymentPage - 1)"
                  >
                    Previous</button
                  ><span class="loan-hint">Page {{ paymentPage }} of {{ paymentLastPage }}</span
                  ><button
                    type="button"
                    class="loan-button loan-button--outline"
                    :disabled="busy || paymentPage >= paymentLastPage"
                    @click="changePaymentPage(paymentPage + 1)"
                  >
                    Next
                  </button>
                </div>
              </section></TabsContent
            >
            <TabsContent value="invoices"
              ><section class="loan-card">
                <div class="loan-card-heading">
                  <FileText :size="18" />
                  <h2>Repayment invoices</h2>
                  <button v-if="loan.status === 'disbursed' && can('loans.repay')" type="button" class="loan-button loan-button--primary" style="margin-left: auto" @click="issueInvoice">
                    Issue invoice for next instalment
                  </button>
                </div>
                <p class="loan-hint">An invoice is issued when the loan is disbursed. Issue another before each instalment falls due, or as a reminder of arrears. Each one prints with the full schedule.</p>
                <div v-if="invoices.length" class="loan-table-wrap">
                  <table class="loan-table">
                    <thead>
                      <tr><th>Invoice</th><th>Issued</th><th>Due</th><th class="num">Amount due</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in invoices" :key="item.id">
                        <td>{{ invoiceNumber(item.number) }}</td>
                        <td>{{ formatDate(item.issued_on) }}</td>
                        <td>{{ formatDate(item.due_on) }}</td>
                        <td class="num">{{ formatMoney(item.total_due) }}</td>
                        <td><span class="badge" :class="`badge--${INVOICE_STATUS[item.status].badge}`">{{ INVOICE_STATUS[item.status].label }}</span></td>
                        <td><button type="button" class="loan-link" @click="printing(() => printLoanInvoice(item.id))">Print</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="loan-empty">No invoices yet.</p>
              </section></TabsContent
            >
            <TabsContent value="commissions"><LoanCommissionLedger :loan-id="loan.id" /></TabsContent>
            <TabsContent value="activity"
              ><section class="loan-card">
                <div class="loan-card-heading">
                  <Clock3 :size="18" />
                  <h2>Application activity</h2>
                </div>
                <ol v-if="loan.events?.length" class="loan-activity">
                  <li v-for="event in loan.events" :key="event.id">
                    <div>
                      <strong>{{ formatEnum(event.event) }}</strong>
                      <p>{{ event.user?.name || 'System' }} · {{ formatEnum(event.to_status) }}</p>
                      <p v-if="event.notes">{{ event.notes }}</p>
                    </div>
                    <time :datetime="event.created_at">{{ formatDate(event.created_at) }}</time>
                  </li>
                </ol>
                <p v-else class="loan-empty">No workflow history is available for this loan.</p>
              </section></TabsContent
            >
          </TabsRoot>
        </div>
        <aside class="loan-sidebar">
          <section class="loan-card">
            <div class="loan-card-heading">
              <ArrowRight :size="18" />
              <h2>Next action</h2>
              <button
                type="button"
                class="loan-icon-button loan-push-right"
                aria-label="Refresh loan"
                :disabled="busy"
                @click="load"
              >
                <RefreshCw :size="15" />
              </button>
            </div>
            <form v-if="formActions.length" class="loan-action-form" @submit.prevent="perform">
              <fieldset class="loan-form-reset" :disabled="busy">
                <div class="loan-fields loan-fields--single">
                  <label for="loan-action"
                    >Action<select id="loan-action" v-model="selectedAction" required>
                      <option v-for="action in formActions" :key="action" :value="action">
                        {{ labels[action] || formatEnum(action) }}
                      </option>
                    </select></label
                  >
                  <template v-if="selectedAction === 'appraise'"
                    ><label for="appraisal-amount"
                      >Recommended amount<input
                        id="appraisal-amount"
                        v-model="actionForm.recommended_amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required /></label
                    ><label for="appraisal-term"
                      >Recommended term (periods)<input
                        id="appraisal-term"
                        v-model.number="actionForm.recommended_term"
                        type="number"
                        min="1"
                        max="1200"
                        step="1"
                        required /></label
                    ><label for="appraisal-rate"
                      >Recommended
                      {{ loan.product?.interest_period === 'per_month' ? 'monthly' : 'annual' }}
                      rate (%)<input
                        id="appraisal-rate"
                        v-model="actionForm.recommended_interest_rate"
                        type="number"
                        min="0"
                        max="999.99"
                        step="0.01"
                        required /></label
                    ><label for="appraisal-method"
                      >Interest method<select
                        id="appraisal-method"
                        v-model="actionForm.recommended_interest_method"
                      >
                        <option value="flat">Flat</option>
                        <option value="reducing_balance">Reducing balance</option>
                      </select></label
                    ><label for="appraisal-risk"
                      >Risk rating<select id="appraisal-risk" v-model="actionForm.risk_rating">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select></label
                    ></template
                  >
                  <label v-if="selectedAction === 'vote'" for="vote-decision"
                    >Committee decision<select id="vote-decision" v-model="actionForm.decision">
                      <option value="approve">Approve</option>
                      <option value="decline">Decline</option>
                    </select></label
                  >
                  <label
                    v-if="needsNotes || selectedAction === 'appraise' || selectedAction === 'vote'"
                    for="action-notes"
                    >{{
                      selectedAction === 'appraise'
                        ? 'Appraisal notes'
                        : selectedAction === 'vote'
                          ? 'Decision rationale'
                          : 'Reason / notes'
                    }}<textarea
                      id="action-notes"
                      v-model="actionForm.notes"
                      rows="4"
                      maxlength="2000"
                      required
                    />
                  </label>
                  <div v-if="disbursementBlocked" class="loan-hint" role="status" style="margin-bottom: 12px">
                    <strong>{{ openConditions.length }} {{ openConditions.length === 1 ? 'condition' : 'conditions' }} left before disbursement.</strong>
                    Finish them in the
                    <button type="button" class="loan-link" @click="tab = 'execution'">Application pack</button>
                    tab: upload and verify the signed documents, record the signatures, and have finance review the pricing.
                  </div>
                  <template v-if="selectedAction === 'disburse'"
                    ><label for="disbursement-date"
                      >Disbursement date<input
                        id="disbursement-date"
                        v-model="actionForm.disbursed_at"
                        type="date"
                        :max="localToday"
                        required /></label
                    ><label for="disbursement-method"
                      >Payment method<select
                        id="disbursement-method"
                        v-model="actionForm.disbursement_method"
                      >
                        <option v-if="loan.application_type !== 'continuing'" value="bank_transfer">
                          Bank transfer
                        </option>
                        <option v-if="loan.application_type !== 'continuing'" value="mobile_money">
                          Mobile money
                        </option>
                        <option value="cash">Cash</option>
                      </select></label
                    ><label for="disbursement-reference"
                      >Disbursement reference<input
                        id="disbursement-reference"
                        v-model="actionForm.disbursement_reference"
                        maxlength="100"
                        required
                    /></label>
                    <p class="loan-hint" v-if="loan.repayment_preview">
                      Net disbursement: {{ formatMoney(loan.repayment_preview.net_disbursement) }} ·
                      Processing fee:
                      {{ formatMoney(loan.repayment_preview.processing_fee) }}
                    </p>
                    <p class="loan-hint">
                      Confirm that funds have been released before recording disbursement. This action posts
                      accounting entries and creates the repayment schedule.
                    </p></template
                  >
                  <template v-if="selectedAction === 'repay'"
                    ><label v-if="loan.uses_workflow" for="repayment-amount"
                      >Payment amount<input
                        id="repayment-amount"
                        v-model="actionForm.amount"
                        type="number"
                        min="0.01"
                        :max="outstanding"
                        step="0.01"
                        required /></label
                    ><template v-else
                      ><label for="repayment-principal"
                        >Principal paid<input
                          id="repayment-principal"
                          v-model="actionForm.principal_paid"
                          type="number"
                          min="0"
                          step="0.01"
                          required /></label
                      ><label for="repayment-interest"
                        >Interest paid<input
                          id="repayment-interest"
                          v-model="actionForm.interest_paid"
                          type="number"
                          min="0"
                          step="0.01"
                          required /></label></template
                    ><label for="repayment-date"
                      >Payment date<input
                        id="repayment-date"
                        v-model="actionForm.paid_at"
                        type="date"
                        :max="localToday"
                        required /></label
                    ><label for="repayment-method"
                      >Paid by<select id="repayment-method" v-model="actionForm.payment_method">
                        <option v-for="method in PAYMENT_METHODS" :key="method.value" :value="method.value">{{ method.label }}</option>
                      </select></label
                    ><label for="repayment-reference"
                      >Transaction reference<input
                        id="repayment-reference"
                        v-model="actionForm.reference"
                        maxlength="100"
                        required
                    /></label>
                    <p v-if="loan.uses_workflow" class="loan-hint">
                      Payments cover interest then principal, oldest installment first. The loan closes when
                      all scheduled principal and interest are paid.
                    </p></template
                  >
                </div>
                <button
                  type="submit"
                  class="loan-button loan-button--primary"
                  style="width: 100%; margin-top: 20px"
                  :disabled="busy || disbursementBlocked"
                >
                  <span v-if="busy" class="spinner" />{{
                    busy ? 'Processing…' : labels[selectedAction as LoanAction] || 'Continue'
                  }}
                </button>
              </fieldset>
            </form>
            <template v-else
              ><p class="loan-empty">
                {{
                  loan.status === 'closed'
                    ? 'This loan is fully repaid and closed.'
                    : loan.status === 'awaiting_guarantors'
                      ? 'Record verified guarantor responses in Security & consent before appraisal can begin.'
                      : 'No action is available for your account at this stage. The assigned officer or an independent reviewer can continue the workflow.'
                }}
              </p>
              <RouterLink
                v-if="actions.includes('edit')"
                class="loan-button loan-button--outline"
                :to="{ name: 'loans.edit', params: { id: loan.id } }"
                >Edit application</RouterLink
              ></template
            ><button
              v-if="actions.includes('consent')"
              type="button"
              class="loan-link"
              style="margin-top: 16px"
              @click="tab = 'security'"
            >
              Record guarantor consent<ArrowRight :size="14" />
            </button>
          </section>
          <section v-if="loan.uses_workflow" class="loan-card">
            <div class="loan-card-heading">
              <UsersRound :size="18" />
              <h2>Committee votes</h2>
            </div>
            <p class="loan-hint">
              {{ votesFor }} approve · {{ votesAgainst }} decline ·
              {{ loan.committee_votes_required }} matching independent votes required.
            </p>
            <div v-for="vote in loan.votes" :key="vote.id" class="loan-vote">
              <div>
                <strong>{{ vote.user.name }} · {{ formatEnum(vote.decision) }}</strong>
                <p>{{ vote.comments }}</p>
                <p>{{ formatDate(vote.created_at) }}</p>
              </div>
            </div>
            <p v-if="!loan.votes?.length" class="loan-empty">No votes recorded.</p>
            <p class="loan-hint">
              The creator, appraising officer, and recommending manager cannot vote on this application.
            </p>
          </section>
          <LoanPreviewCard
            v-if="!['disbursed', 'closed'].includes(loan.status)"
            :preview="loan.repayment_preview ?? null"
          />
        </aside>
      </div>
    </template>
  </div>
</template>
