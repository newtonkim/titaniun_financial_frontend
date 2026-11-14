<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Check, FileText, HandCoins, Save, Send, ShieldCheck, UserRound } from 'lucide-vue-next'
import { formatEnum, formatMoney, formatPercent } from '@/core/utils/format'
import LoanMemberPicker from '../components/LoanMemberPicker.vue'
import LoanPreviewCard from '../components/LoanPreviewCard.vue'
import LoanSecurityFields from '../components/LoanSecurityFields.vue'
import { useLoanApplication } from '../composables/useLoanApplication'
import type { RepaymentFrequency } from '../types'
import '../loan-workflow.css'

const {
  editingId,
  step,
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
  eligibilityError,
  load,
  goTo,
  refresh,
  save,
} = useLoanApplication()
const pageRoot = ref<HTMLElement>()
watch(step, async () => {
  await nextTick()
  pageRoot.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
})
watch(loading, async (value) => {
  if (!value) {
    await nextTick()
    pageRoot.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
})
const steps = [
  { title: 'Member & product', description: 'Choose the borrower and loan' },
  { title: 'Loan details', description: 'Set terms and add security' },
  { title: 'Review & submit', description: 'Check and save your application' },
]
const termUnits: Record<RepaymentFrequency, string> = {
  daily: 'days',
  weekly: 'weeks',
  biweekly: 'fortnights',
  monthly: 'months',
  yearly: 'years',
}
</script>

<template>
  <div ref="pageRoot" class="loan-workflow">
    <header class="loan-page-header">
      <div class="loan-page-title">
        <RouterLink
          class="loan-back-button"
          :to="editingId ? { name: 'loans.show', params: { id: editingId } } : { name: 'loans.index' }"
          aria-label="Back to loans"
          ><ArrowLeft :size="18" /></RouterLink
        ><span class="loan-title-icon"><HandCoins :size="23" /></span>
        <div>
          <h1>{{ editingId ? 'Edit loan application' : 'New loan application' }}</h1>
          <p>Prepare an application, review eligibility, and submit it for appraisal.</p>
        </div>
      </div>
      <RouterLink class="loan-button loan-button--outline" :to="{ name: 'loans.index' }">Cancel</RouterLink>
    </header>
    <div v-if="loading" class="loan-card loan-loading" role="status">
      <span class="spinner" />Loading application form…
    </div>
    <section v-else-if="loadingError" class="loan-card loan-empty" role="alert">
      <p>{{ loadingError }}</p>
      <button type="button" class="loan-button loan-button--outline" @click="load">Try again</button>
    </section>
    <template v-else>
      <nav class="loan-stepper loan-card" aria-label="Application steps">
        <ol>
          <li
            v-for="(item, index) in steps"
            :key="item.title"
            :class="{ 'is-current': step === index + 1, 'is-complete': step > index + 1 }"
          >
            <button
              type="button"
              :aria-current="step === index + 1 ? 'step' : undefined"
              :disabled="busy || index + 1 > step"
              @click="goTo(index + 1)"
            >
              <span class="loan-step-number"
                ><Check v-if="step > index + 1" :size="17" /><template v-else>{{ index + 1 }}</template></span
              ><span
                ><strong>{{ item.title }}</strong
                ><small>{{ item.description }}</small></span
              >
            </button>
          </li>
        </ol>
      </nav>
      <div v-if="message" class="loan-alert loan-alert--error" role="alert">
        <strong>{{ message }}</strong>
        <ul v-if="Object.keys(errors).length">
          <li v-for="(messages, field) in errors" :key="field">{{ messages[0] }}</li>
        </ul>
      </div>
      <form novalidate @submit.prevent="step === 3 ? save(false) : goTo(step + 1)">
        <fieldset class="loan-form-reset" :disabled="busy">
          <legend class="loan-sr-only">Loan application</legend>
          <div v-if="step === 1" class="loan-columns">
            <section class="loan-card">
              <div class="loan-card-heading">
                <UserRound :size="18" />
                <h2>Member & product</h2>
                <span class="loan-step-caption">Step 1 of 3</span>
              </div>
              <div class="loan-fields loan-fields--single">
                <div>
                  <label class="loan-field-label">Borrower <span aria-hidden="true">*</span></label
                  ><LoanMemberPicker v-model="member" label="Borrower" category="member" :disabled="!!editingId" />
                  <p v-if="errors.member_id" class="loan-field-error">{{ errors.member_id[0] }}</p>
                  <p class="loan-hint">Only active members can apply for a loan.</p>
                </div>
                <label for="application-product"
                  >Loan product <span aria-hidden="true">*</span
                  ><select
                    id="application-product"
                    v-model="form.loan_product_id"
                    :disabled="!!editingId"
                    :aria-invalid="!!errors.loan_product_id"
                  >
                    <option :value="null" disabled>Choose a loan product</option>
                    <option v-for="item in products" :key="item.id" :value="item.id">
                      {{ item.name }} · {{ item.code }}
                    </option></select
                  ><span v-if="errors.loan_product_id" class="loan-field-error">{{
                    errors.loan_product_id[0]
                  }}</span></label
                >
                <p v-if="!products.length" class="loan-alert">
                  No active loan products are available.
                  <RouterLink class="loan-link" :to="{ name: 'loans.products' }">Manage loan products</RouterLink>
                </p>
                <label for="application-officer"
                  >Loan officer <span aria-hidden="true">*</span
                  ><select
                    id="application-officer"
                    v-model="form.loan_officer_id"
                    :aria-invalid="!!errors.loan_officer_id"
                  >
                    <option :value="null" disabled>Assign a loan officer</option>
                    <option v-for="officer in options.officers" :key="officer.id" :value="officer.id">
                      {{ officer.name }}
                    </option></select
                  ><span v-if="errors.loan_officer_id" class="loan-field-error">{{ errors.loan_officer_id[0] }}</span
                  ><span class="loan-hint">The assigned officer will review and appraise this application.</span></label
                >
              </div>
              <footer class="loan-card-footer">
                <p>Application number is generated when saved.</p>
                <button type="submit" class="loan-button loan-button--primary">
                  Continue to loan details<ArrowRight :size="16" />
                </button>
              </footer>
            </section>
            <aside class="loan-sidebar">
              <section class="loan-card">
                <h2>Product details</h2>
                <dl v-if="product" class="loan-summary-list">
                  <div>
                    <dt>Interest rate</dt>
                    <dd>
                      {{ product.interest_rate }}%
                      {{ product.interest_period === 'per_month' ? 'per month' : 'per year' }}
                    </dd>
                  </div>
                  <div>
                    <dt>Interest method</dt>
                    <dd>{{ formatEnum(form.interest_method) }}</dd>
                  </div>
                  <div>
                    <dt>Repayment cycle</dt>
                    <dd>{{ formatEnum(product.repayment_frequency) }}</dd>
                  </div>
                  <div>
                    <dt>Amount range</dt>
                    <dd>
                      {{ formatMoney(product.min_amount) }} –
                      {{ product.max_amount === null ? 'No upper limit' : formatMoney(product.max_amount) }}
                    </dd>
                  </div>
                  <div>
                    <dt>Term range</dt>
                    <dd>
                      {{ product.min_term }} – {{ product.max_term }}
                      {{ termUnits[product.repayment_frequency] }}
                    </dd>
                  </div>
                </dl>
                <p v-else class="loan-empty">Choose a product to see its pricing, terms, and security requirements.</p>
              </section>
              <section class="loan-card loan-help-card">
                <ShieldCheck :size="22" />
                <h2>A clear path to disbursement</h2>
                <p>
                  Your application will move through guarantor consent, officer appraisal, manager recommendation, and
                  independent committee voting before funds are released.
                </p>
                <p>
                  {{ options.committee_votes_required === 1 ? 'One independent committee vote decides the application.' : `${options.committee_votes_required} independent committee votes are required for a decision.` }}
                </p>
              </section>
            </aside>
          </div>
          <div v-else-if="step === 2" class="loan-columns">
            <div class="loan-main">
              <section class="loan-card">
                <div class="loan-card-heading">
                  <FileText :size="18" />
                  <h2>Loan details</h2>
                  <span class="loan-step-caption">Step 2 of 3</span>
                </div>
                <div class="loan-fields">
                  <label for="application-amount"
                    >Requested amount <span aria-hidden="true">*</span
                    ><input
                      id="application-amount"
                      v-model="form.principal"
                      type="number"
                      step="0.01"
                      :min="product?.min_amount || '0.01'"
                      :max="product?.max_amount ?? undefined"
                      placeholder="0.00"
                      :aria-invalid="!!errors.principal"
                    /><span v-if="errors.principal" class="loan-field-error">{{ errors.principal[0] }}</span
                    ><span class="loan-hint"
                      >{{ formatMoney(product?.min_amount) }} –
                      {{ product?.max_amount === null ? 'No upper limit' : formatMoney(product?.max_amount) }}</span
                    ></label
                  >
                  <label for="application-term"
                    >Loan term <span aria-hidden="true">*</span>
                    <div class="loan-input-unit">
                      <input
                        id="application-term"
                        v-model="form.term"
                        type="number"
                        :min="product?.min_term || 1"
                        :max="product?.max_term"
                        step="1"
                        :aria-invalid="!!errors.term"
                      /><span>{{ product ? termUnits[product.repayment_frequency] : 'periods' }}</span>
                    </div>
                    <span v-if="errors.term" class="loan-field-error">{{ errors.term[0] }}</span
                    ><span class="loan-hint"
                      >{{ product?.min_term }} – {{ product?.max_term }} repayment periods</span
                    ></label
                  >
                  <label for="application-interest-method"
                    >Interest method<select id="application-interest-method" v-model="form.interest_method">
                      <option value="flat">Flat interest on original principal</option>
                      <option value="reducing_balance">Reducing balance</option></select
                    ><span v-if="errors.interest_method" class="loan-field-error">{{
                      errors.interest_method[0]
                    }}</span></label
                  >
                  <label for="application-commission-recipient"
                    >Commission recipient<select
                      id="application-commission-recipient"
                      v-model="form.commission_member_id"
                    >
                      <option :value="null">Assigned loan officer</option>
                      <option
                        v-for="guarantor in form.guarantors"
                        :key="guarantor.member_id"
                        :value="guarantor.member_id"
                      >
                        Referring guarantor:
                        {{ guarantorNames[guarantor.member_id] ?? guarantor.member_id }}
                      </option></select
                    ><span class="loan-hint"
                      >Choose a referring guarantor after adding them under security. The selected recipient earns the
                      entire {{ formatPercent(product?.commission_interest_rate) }}% commission.</span
                    ><span v-if="errors.commission_member_id" class="loan-field-error">{{
                      errors.commission_member_id[0]
                    }}</span></label
                  >
                  <label class="loan-span-all" for="application-purpose"
                    >Loan purpose <span aria-hidden="true">*</span
                    ><textarea
                      id="application-purpose"
                      v-model="form.purpose"
                      rows="3"
                      maxlength="500"
                      placeholder="Describe what the loan will be used for…"
                      :aria-invalid="!!errors.purpose"
                    /><span v-if="errors.purpose" class="loan-field-error">{{ errors.purpose[0] }}</span></label
                  >
                  <label class="loan-span-all" for="application-source"
                    >Repayment source<input
                      id="application-source"
                      v-model="form.repayment_source"
                      maxlength="255"
                      placeholder="e.g. Monthly salary or business income"
                  /></label>
                </div>
              </section>
              <LoanSecurityFields
                v-model:collaterals="form.collaterals"
                v-model:guarantors="form.guarantors"
                v-model:guarantor-names="guarantorNames"
                :product="product"
                :amount="Number(form.principal) || 0"
                :borrower-id="member?.id ?? null"
                :disabled="busy"
              />
              <section class="loan-card loan-document-note">
                <FileText :size="19" />
                <div>
                  <h2>Supporting documents</h2>
                  <p>
                    Save this application as a draft to upload identity, income, collateral, or other supporting
                    documents on its detail page.
                  </p>
                </div>
              </section>
              <div class="loan-navigation">
                <button type="button" class="loan-button loan-button--outline" @click="goTo(1)">
                  <ArrowLeft :size="16" />Back</button
                ><button type="submit" class="loan-button loan-button--primary">
                  Review application<ArrowRight :size="16" />
                </button>
              </div>
            </div>
            <aside class="loan-sidebar">
              <LoanPreviewCard :preview="preview" :loading="checking" :error="previewError" @retry="refresh" />
              <section class="loan-card loan-help-card">
                <h2>Your selected product</h2>
                <strong>{{ product?.name }}</strong>
                <p>
                  {{ product?.interest_rate }}%
                  {{ product?.interest_period === 'per_month' ? 'per month' : 'per year' }} ·
                  {{ formatEnum(product?.repayment_frequency) }} repayments
                </p>
                <p v-if="product">
                  Security coverage: {{ product.security_value_percentage }}% of the requested amount.
                </p>
              </section>
            </aside>
          </div>
          <div v-else class="loan-columns">
            <div class="loan-main">
              <section class="loan-card">
                <div class="loan-card-heading">
                  <FileText :size="18" />
                  <h2>Application summary</h2>
                  <button type="button" class="loan-link loan-push-right" @click="goTo(1)">Edit</button>
                </div>
                <dl class="loan-review-list">
                  <div>
                    <dt>Borrower</dt>
                    <dd>
                      {{ member?.name }}<small>{{ member?.member_number }}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Loan product</dt>
                    <dd>
                      {{ product?.name }}<small>{{ product?.code }}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Requested amount</dt>
                    <dd>{{ formatMoney(form.principal) }}</dd>
                  </div>
                  <div>
                    <dt>Loan term</dt>
                    <dd>
                      {{ form.term }}
                      {{ product ? termUnits[product.repayment_frequency] : 'periods' }}
                    </dd>
                  </div>
                  <div>
                    <dt>Loan officer</dt>
                    <dd>
                      {{ options.officers.find((item) => item.id === form.loan_officer_id)?.name }}
                    </dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{{ form.purpose }}</dd>
                  </div>
                  <div>
                    <dt>Repayment source</dt>
                    <dd>{{ form.repayment_source || 'Not provided' }}</dd>
                  </div>
                </dl>
              </section>
              <section class="loan-card">
                <div class="loan-card-heading">
                  <ShieldCheck :size="18" />
                  <h2>Security summary</h2>
                  <button type="button" class="loan-link loan-push-right" @click="goTo(2)">Edit</button>
                </div>
                <ul class="loan-security-list">
                  <li v-for="(item, index) in form.collaterals" :key="index">
                    <ShieldCheck :size="17" />
                    <div>
                      <strong>{{ item.asset_type }} · {{ formatMoney(item.estimated_value) }}</strong>
                      <p>{{ item.description }}</p>
                    </div>
                  </li>
                  <li v-for="item in form.guarantors" :key="item.member_id">
                    <UserRound :size="17" />
                    <div>
                      <strong>{{ guarantorNames[item.member_id] }}</strong>
                      <p>{{ formatMoney(item.guaranteed_amount) }} · Consent will be requested on submission</p>
                    </div>
                  </li>
                </ul>
                <p v-if="!form.collaterals.length && !form.guarantors.length" class="loan-hint">
                  No collateral or guarantors added.
                </p>
              </section>
              <div class="loan-alert">
                <ShieldCheck :size="18" />
                <p>
                  Submission starts the review workflow. It does not approve the loan or release funds. If guarantors
                  are included, verified consent must be recorded first.
                </p>
              </div>
              <div class="loan-navigation">
                <button type="button" class="loan-button loan-button--outline" @click="goTo(2)">
                  <ArrowLeft :size="16" />Back
                </button>
                <div class="loan-inline-actions">
                  <button type="submit" class="loan-button loan-button--outline" :disabled="busy">
                    <Save :size="16" />{{ busy ? 'Saving…' : 'Save draft' }}</button
                  ><button
                    type="button"
                    class="loan-button loan-button--primary"
                    :disabled="busy || checking || !eligibility?.eligible || !!eligibilityError"
                    @click="save(true)"
                  >
                    <Send :size="16" />{{ busy ? 'Saving…' : 'Save & submit' }}
                  </button>
                </div>
              </div>
            </div>
            <aside class="loan-sidebar">
              <section class="loan-card" aria-labelledby="eligibility-title" :aria-busy="checking">
                <div class="loan-card-heading">
                  <ShieldCheck :size="18" />
                  <h2 id="eligibility-title">Eligibility check</h2>
                </div>
                <p v-if="checking" role="status" class="loan-empty">Checking application eligibility…</p>
                <template v-else-if="eligibility"
                  ><p class="loan-eligibility-result" :class="{ 'has-failures': !eligibility.eligible }">
                    {{ eligibility.eligible ? 'Ready to submit' : 'Some requirements are not met' }}
                  </p>
                  <ul class="loan-checks">
                    <li v-for="check in eligibility.checks" :key="check.key">
                      <Check v-if="check.passed" :size="16" /><span v-else class="loan-check-warning" aria-hidden="true"
                        >!</span
                      >
                      <div>
                        <strong>{{ check.label }}</strong>
                        <p v-if="!check.passed">{{ check.reason }}</p>
                      </div>
                    </li>
                  </ul>
                  <p class="loan-hint">Savings balance: {{ formatMoney(eligibility.savings_balance) }}</p></template
                >
                <p v-else class="loan-empty">
                  {{ eligibilityError || 'Complete the member, amount, and term to check eligibility.' }}
                </p>
                <button
                  v-if="eligibilityError || !eligibility"
                  type="button"
                  class="loan-link"
                  :disabled="checking"
                  @click="refresh"
                >
                  Retry eligibility check
                </button>
              </section>
              <LoanPreviewCard :preview="preview" :loading="checking" :error="previewError" @retry="refresh" />
            </aside>
          </div>
        </fieldset>
      </form>
    </template>
  </div>
</template>
