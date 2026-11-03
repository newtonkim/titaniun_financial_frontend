<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { CheckCircle2, Circle, Download, FileCheck2, FileUp, PenLine, ShieldCheck } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import { formatDate, formatEnum } from '@/core/utils/format'
import { loanApplicationsApi, loansApi } from '../api'
import { documentCategories } from '../application-policy'
import { downloadApplicationPack } from '../application-pack'
import { createRepaymentSchedule, downloadContinuingAgreement } from '../continuing-agreement'
import type { Loan, LoanAgreementSnapshot } from '../types'

const props = defineProps<{ loan: Loan }>()
const originalContinuingFormUrl = `${import.meta.env.BASE_URL}continuing-client-loan-v1.pdf`
const emit = defineEmits<{ updated: [loan: Loan] }>()
const busy = ref(false)
const error = ref('')
const notice = ref('')
const errors = ref<Record<string, string[]>>({})
const permissions = ref<string[]>([])
const mode = ref('documents')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const upload = reactive({ title: '', category: 'national_id', guarantor_id: null as number | null })
const review = reactive({ document_id: 0, decision: 'verified', notes: '' })
const pricing = reactive({ notes: '', acknowledged: false })
const signature = reactive({
  document_id: 0,
  guarantor_id: null as number | null,
  signer_type: 'applicant',
  signer_name: '',
  signed_at: new Date().toLocaleDateString('en-CA'),
  details: { address: '', occupation: '', designation: '', national_id: '' },
})
const defer = reactive({ notes: '', review_date: '' })
const can = (permission: string) => permissions.value.includes(permission)
const pendingChecks = computed(() => (props.loan.execution_checklist ?? []).filter((item) => !item.complete))
const needsGuarantor = computed(() => ['guarantor', 'guarantor_witness'].includes(signature.signer_type))
/** Only the signed copies the chosen signatory can sign against: a guarantor's own guarantee, or the application or facility agreement. */
const currentDocuments = computed(() =>
  (props.loan.documents ?? []).filter(
    (item) =>
      item.verification_status === 'verified' &&
      item.agreement_revision === props.loan.agreement_revision &&
      (needsGuarantor.value
        ? item.category === 'signed_guarantee' && item.guarantor_id === signature.guarantor_id
        : ['signed_application', 'signed_agreement'].includes(item.category ?? '')),
  ),
)
watch(currentDocuments, (documents) => {
  if (!documents.some((item) => item.id === signature.document_id)) signature.document_id = 0
})
async function run(action: string, payload: Record<string, unknown>) {
  busy.value = true
  error.value = ''
  notice.value = ''
  errors.value = {}
  try {
    emit('updated', await loanApplicationsApi.action(props.loan.id, action, payload))
    notice.value = 'The loan record has been updated.'
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The action could not be completed.'
    errors.value = failure instanceof ApiError ? failure.errors : {}
  } finally {
    busy.value = false
  }
}
async function uploadFile() {
  if (!file.value || busy.value) return
  busy.value = true
  error.value = ''
  errors.value = {}
  try {
    emit(
      'updated',
      await loansApi.uploadDocument(
        props.loan.id,
        upload.title.trim(),
        file.value,
        upload.category,
        upload.guarantor_id,
      ),
    )
    notice.value = 'Document uploaded. Verify the document before recording signatures.'
    file.value = null
    upload.title = ''
    if (fileInput.value) fileInput.value.value = ''
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Upload failed.'
    errors.value = failure instanceof ApiError ? failure.errors : {}
  } finally {
    busy.value = false
  }
}
async function downloadPack() {
  busy.value = true
  error.value = ''
  try {
    const pack = await loanApplicationsApi.pack(props.loan.id)
    downloadApplicationPack(pack.snapshot, pack.preview)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The pack could not be issued.'
  } finally {
    busy.value = false
  }
}
async function downloadContinuingDocument(schedule = false, archived?: LoanAgreementSnapshot) {
  busy.value = true
  error.value = ''
  try {
    const snapshot = archived ?? (await loanApplicationsApi.pack(props.loan.id)).snapshot
    if (schedule) {
      if (!snapshot.repayment_preview) throw new Error('The approved schedule is unavailable.')
      createRepaymentSchedule(
        snapshot.repayment_preview,
        snapshot.applicant.display_name ?? '',
        `${snapshot.loan_number} · Revision ${snapshot.revision}`,
      ).save(`${snapshot.loan_number}-repayment-schedule-r${snapshot.revision}.pdf`)
    } else {
      await downloadContinuingAgreement(snapshot, Boolean(archived))
    }
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The document could not be downloaded.'
  } finally {
    busy.value = false
  }
}
async function downloadDocument(id: number, name: string) {
  error.value = ''
  try {
    await loansApi.downloadDocument(props.loan.id, id, name)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The document could not be downloaded.'
  }
}
onMounted(async () => {
  try {
    const options = await loansApi.options()
    permissions.value = options.permissions ?? []
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not load your permissions.'
  }
})
</script>

<template>
  <section class="loan-card execution-panel">
    <div class="loan-card-heading">
      <ShieldCheck :size="20" />
      <h2>Application pack & release conditions</h2>
      <span class="execution-revision">Revision {{ loan.agreement_revision }}</span>
    </div>
    <p class="loan-hint">
      Approved terms, verified documents and witnessed signatures stay linked to this revision. Material
      changes require fresh approval and signatures.
    </p>
    <div class="execution-readiness">
      <strong>{{
        pendingChecks.length
          ? `${pendingChecks.length} conditions to complete`
          : 'All release conditions complete'
      }}</strong>
      <div v-for="item in loan.execution_checklist" :key="item.key">
        <CheckCircle2 v-if="item.complete" :size="16" /><Circle v-else :size="16" /><span>{{
          item.label
        }}</span>
      </div>
    </div>
    <div class="execution-toolbar">
      <template v-if="loan.application_type === 'continuing'">
        <a
          class="loan-button loan-button--outline"
          :href="originalContinuingFormUrl"
          download="Continuing Clients Loan Document.pdf"
          ><Download :size="16" />Original form</a
        >
        <button
          type="button"
          class="loan-button loan-button--primary"
          :disabled="
            busy || !['approved', 'disbursed', 'closed'].includes(loan.status) || !loan.pricing_review
          "
          @click="downloadContinuingDocument(false)"
        >
          <Download :size="16" />Short loan agreement
        </button>
        <button
          type="button"
          class="loan-button loan-button--outline"
          :disabled="
            busy || !['approved', 'disbursed', 'closed'].includes(loan.status) || !loan.pricing_review
          "
          @click="downloadContinuingDocument(true)"
        >
          <Download :size="16" />Repayment schedule
        </button>
      </template>
      <button
        type="button"
        class="loan-button loan-button--primary"
        :disabled="busy || !['approved', 'disbursed', 'closed'].includes(loan.status) || !loan.pricing_review"
        @click="downloadPack"
      >
        <Download :size="16" />{{
          loan.application_type === 'continuing' ? 'Supporting application & guarantees' : 'Download pack'
        }}</button
      ><span class="loan-hint">Committee approval and finance review are required before issue.</span>
    </div>
    <div v-if="loan.agreement_history?.length" class="application-checks">
      <h3>Previous approved terms</h3>
      <p class="loan-hint">
        Earlier revisions remain available for audit. Archived copies are marked as superseded.
      </p>
      <div v-for="revision in loan.agreement_history" :key="revision.snapshot.revision">
        <span
          >Revision {{ revision.snapshot.revision }} · archived {{ formatDate(revision.archived_at) }}</span
        >
        <button
          type="button"
          class="loan-link"
          :disabled="busy || !revision.pricing_review"
          @click="downloadApplicationPack(revision.snapshot, revision.snapshot.repayment_preview, true)"
        >
          Download archived copy
        </button>
        <button
          v-if="revision.snapshot.application_type === 'continuing'"
          type="button"
          class="loan-link"
          :disabled="busy || !revision.pricing_review"
          @click="downloadContinuingDocument(false, revision.snapshot)"
        >
          Archived short agreement
        </button>
      </div>
    </div>
    <div class="execution-tabs" aria-label="Application pack tools">
      <button type="button" :class="{ active: mode === 'documents' }" @click="mode = 'documents'">
        <FileUp :size="15" />Documents</button
      ><button
        v-if="can('loans.documents.verify')"
        type="button"
        :class="{ active: mode === 'signatures' }"
        @click="mode = 'signatures'"
      >
        <PenLine :size="15" />Signatures</button
      ><button
        v-if="can('loans.pricing.review')"
        type="button"
        :class="{ active: mode === 'pricing' }"
        @click="mode = 'pricing'"
      >
        Pricing review</button
      ><button
        v-if="can('loans.vote') && loan.status === 'committee_voting'"
        type="button"
        :class="{ active: mode === 'defer' }"
        @click="mode = 'defer'"
      >
        Defer decision</button
      ><button
        v-if="can('access.manage')"
        type="button"
        :class="{ active: mode === 'access' }"
        @click="mode = 'access'"
      >
        Staff access
      </button>
    </div>
    <p v-if="error" class="application-alert" role="alert">{{ error }}</p>
    <p v-if="notice" class="loan-hint" role="status">{{ notice }}</p>
    <ul v-if="Object.keys(errors).length" class="application-errors">
      <li v-for="(messages, key) in errors" :key="key">{{ messages[0] }}</li>
    </ul>
    <div v-if="mode === 'documents'">
      <div v-if="loan.documents?.length" class="loan-table-wrap">
        <table class="loan-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type / revision</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in loan.documents" :key="item.id">
              <td>
                <button
                  type="button"
                  class="loan-link"
                  @click="downloadDocument(item.id, item.original_name)"
                >
                  {{ item.title }}</button
                ><small class="execution-file-name">{{ item.original_name }}</small>
              </td>
              <td>
                {{ formatEnum(item.category)
                }}<small class="execution-file-name">Revision {{ item.agreement_revision }}</small>
              </td>
              <td>
                {{ formatEnum(item.verification_status)
                }}<small v-if="item.verification_notes" class="execution-file-name">{{
                  item.verification_notes
                }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="loan-empty">
        Upload identity documents first. Signed copies are added after committee approval.
      </p>
      <form
        v-if="loan.available_actions?.includes('documents')"
        class="loan-subform"
        @submit.prevent="uploadFile"
      >
        <h3>Upload a document</h3>
        <fieldset :disabled="busy" class="application-fieldset">
          <div class="loan-fields">
            <label>Document title<input v-model="upload.title" required maxlength="255" /></label
            ><label
              >Document category<select v-model="upload.category">
                <option v-for="category in documentCategories" :key="category.value" :value="category.value">
                  {{ category.label }}
                </option>
              </select></label
            ><label v-if="upload.category === 'signed_guarantee'"
              >Guarantor<select v-model.number="upload.guarantor_id" required>
                <option :value="null" disabled>Select guarantor</option>
                <option v-for="item in loan.guarantors" :key="item.id" :value="item.id">
                  {{ item.member.name }}
                </option>
              </select></label
            ><label
              >File · PDF or image, up to 5 MB<input
                ref="fileInput"
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null"
            /></label>
          </div>
          <button
            class="loan-button loan-button--outline"
            type="submit"
            :disabled="!file"
            style="margin-top: 16px"
          >
            {{ busy ? 'Uploading…' : 'Upload document' }}
          </button>
        </fieldset>
      </form>
      <form
        v-if="can('loans.documents.verify') && !['disbursed', 'closed'].includes(loan.status)"
        class="loan-subform"
        @submit.prevent="run('verify-document', { ...review })"
      >
        <h3>Verify a document</h3>
        <fieldset :disabled="busy" class="application-fieldset">
          <div class="loan-fields">
            <label
              >Document<select v-model.number="review.document_id" required>
                <option :value="0" disabled>Select document</option>
                <option v-for="item in loan.documents" :key="item.id" :value="item.id">
                  {{ item.title }} · {{ formatEnum(item.verification_status) }}
                </option>
              </select></label
            ><label
              >Decision<select v-model="review.decision">
                <option value="verified">Verified</option>
                <option value="rejected">Rejected / replacement required</option>
              </select></label
            ><label class="loan-span-all"
              >Verification notes<textarea v-model="review.notes" required rows="2" />
            </label>
          </div>
          <button type="submit" class="loan-button loan-button--outline" style="margin-top: 16px" :disabled="!review.document_id">
            <FileCheck2 :size="16" />Record verification
          </button>
        </fieldset>
      </form>
    </div>
    <div v-else-if="mode === 'signatures'">
      <div v-if="loan.signatures?.length" class="loan-table-wrap">
        <table class="loan-table">
          <thead>
            <tr>
              <th>Signatory</th>
              <th>Capacity</th>
              <th>Date / revision</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in loan.signatures" :key="item.id">
              <td>{{ item.signer_name }}</td>
              <td>{{ formatEnum(item.signer_type) }}</td>
              <td>{{ formatDate(item.signed_at) }} · r{{ item.agreement_revision }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <form
        v-if="loan.status === 'approved'"
        class="loan-subform"
        @submit.prevent="
          run('signature', { ...signature, guarantor_id: needsGuarantor ? signature.guarantor_id : null })
        "
      >
        <h3>Record a verified paper signature</h3>
        <p class="loan-hint">
          Signatures reference a verified signed copy. Upload and verify that document first.
        </p>
        <fieldset :disabled="busy" class="application-fieldset">
          <div class="loan-fields">
            <label
              >Signing capacity<select v-model="signature.signer_type">
                <option value="applicant">Applicant / authorized signatory</option>
                <option value="applicant_witness">Applicant witness</option>
                <option value="guarantor">Guarantor</option>
                <option value="guarantor_witness">Guarantor witness</option>
                <option value="lender">Lender representative</option>
              </select></label
            ><label>Signatory name<input v-model="signature.signer_name" required /></label
            ><label v-if="needsGuarantor"
              >Guarantor<select v-model.number="signature.guarantor_id" required>
                <option :value="null" disabled>Select guarantor</option>
                <option v-for="item in loan.guarantors" :key="item.id" :value="item.id">
                  {{ item.member.name }}
                </option>
              </select></label
            ><label
              >Verified signed document<select v-model.number="signature.document_id" required>
                <option :value="0" disabled>{{ currentDocuments.length ? 'Select verified document' : 'None available yet' }}</option>
                <option v-for="item in currentDocuments" :key="item.id" :value="item.id">
                  {{ item.title }}
                </option>
              </select>
              <span v-if="!currentDocuments.length" class="loan-hint">
                {{ needsGuarantor ? 'Upload this guarantor’s signed guarantee in Documents as “Signed guarantee agreement”, then verify it.' : 'Upload the signed copy in Documents as “Signed application & declaration” or “Signed facility agreement”, then verify it.' }}
              </span></label
            ><label>Signed on<input v-model="signature.signed_at" type="date" required /></label
            ><label
              >Address<input
                v-model="signature.details.address"
                :required="signature.signer_type.includes('witness')" /></label
            ><label
              >Occupation<input
                v-model="signature.details.occupation"
                :required="signature.signer_type.includes('witness')" /></label
            ><label>Designation / title<input v-model="signature.details.designation" /></label>
          </div>
          <button type="submit" class="loan-button loan-button--outline" style="margin-top: 16px" :disabled="!signature.document_id">
            <PenLine :size="16" />Record signature
          </button>
        </fieldset>
      </form>
      <p v-else class="loan-empty">
        Final signatures can be recorded once the committee approves the application.
      </p>
    </div>
    <form
      v-else-if="mode === 'pricing'"
      class="loan-subform"
      @submit.prevent="run('review-pricing', { ...pricing })"
    >
      <h3>Finance review of approved pricing</h3>
      <p class="loan-hint">
        Review the actual product rate, calculation method and every charge. This review does not change the
        approved terms.
      </p>
      <fieldset :disabled="busy || loan.status !== 'approved'" class="application-fieldset">
        <label class="loan-field-label"
          >Review notes<textarea
            v-model="pricing.notes"
            rows="3"
            required
            minlength="10"
            placeholder="Record the approved pricing basis and fee verification."
          /></label
        ><label class="application-checkbox"
          ><input v-model="pricing.acknowledged" type="checkbox" required /><span
            >I have reviewed the approved interest rate, itemized fees and proposed document terms.</span
          ></label
        ><button type="submit" class="loan-button loan-button--primary">Record finance review</button>
      </fieldset>
    </form>
    <form v-else-if="mode === 'defer'" class="loan-subform" @submit.prevent="run('defer', { ...defer })">
      <h3>Defer the committee decision</h3>
      <fieldset :disabled="busy" class="application-fieldset">
        <label class="loan-field-label"
          >Reason and required follow-up<textarea v-model="defer.notes" required rows="3" /></label
        ><label class="loan-field-label"
          >Review date<input v-model="defer.review_date" type="date" required /></label
        ><button type="submit" class="loan-button loan-button--outline" style="margin-top: 16px">
          Record deferral
        </button>
      </fieldset>
    </form>
    <div v-else-if="mode === 'access'" class="loan-subform">
      <h3>Staff roles and permissions</h3>
      <p class="loan-hint">Manage responsibilities and access for your whole team in Settings.</p>
      <RouterLink class="loan-button loan-button--outline" :to="{ name: 'settings.roles' }">Open roles & permissions</RouterLink>
    </div>
  </section>
</template>
