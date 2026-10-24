import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/core/api/http'
import type { Member } from '@/modules/members/types'
import { loanProductsApi, loansApi } from '../api'
import type {
  InterestMethod,
  LoanCollateralInput,
  LoanEligibility,
  LoanGuarantorInput,
  LoanOptions,
  LoanApplicationData,
  LoanChargeInput,
  LoanProduct,
  LoanProductPreview,
  StoreLoanPayload,
} from '../types'

export function useLoanApplication() {
  const route = useRoute()
  const router = useRouter()
  const editingId = computed(() => (route.name === 'loans.edit' ? Number(route.params.id) : null))
  const step = ref(1)
  const loading = ref(true)
  const loadingError = ref('')
  const busy = ref(false)
  const message = ref('')
  const errors = ref<Record<string, string[]>>({})
  const member = ref<Member | null>(null)
  const products = ref<LoanProduct[]>([])
  const options = ref<LoanOptions>({ officers: [], committee_votes_required: 2 })
  const blankApplication = (): LoanApplicationData => ({ applicant_type: 'individual', display_name: '', national_id: '', date_of_birth: '', employer: '', occupation: '', address: '', district: '', phone: '', email: '', business_registration_number: '', business_activity: '', signatory_name: '', signatory_title: '', signatory_national_id: '', declaration_accepted: false, declaration_name: '' })
  const form = reactive({
    application_data: blankApplication(),
    charges: [] as LoanChargeInput[],
    loan_product_id: null as number | null,
    loan_officer_id: null as number | null,
    commission_member_id: null as number | null,
    interest_method: 'flat' as InterestMethod,
    principal: '',
    term: '' as number | string,
    purpose: '',
    repayment_source: '',
    collaterals: [] as LoanCollateralInput[],
    guarantors: [] as LoanGuarantorInput[],
  })
  const guarantorNames = ref<Record<number, string>>({})
  const product = computed(() => products.value.find((item) => item.id === form.loan_product_id) ?? null)
  const preview = ref<LoanProductPreview | null>(null)
  const eligibility = ref<LoanEligibility | null>(null)
  const checking = ref(false)
  const previewError = ref('')
  const eligibilityError = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined
  let sequence = 0
  let disposed = false
  let loadSequence = 0

  function payload(): StoreLoanPayload {
    return {
      member_id: member.value?.id ?? 0,
      application_data: { ...form.application_data },
      charges: form.charges,
      loan_product_id: form.loan_product_id ?? 0,
      loan_officer_id: form.loan_officer_id,
      commission_member_id: form.commission_member_id,
      interest_method: form.interest_method,
      principal: String(form.principal),
      term: Number(form.term),
      purpose: form.purpose.trim(),
      repayment_source: form.repayment_source.trim(),
      collaterals: form.collaterals,
      guarantors: form.guarantors,
    }
  }
  async function load(): Promise<void> {
    const current = ++loadSequence
    loading.value = true
    loadingError.value = ''
    try {
      const [listedProducts, workflowOptions] = await Promise.all([
        loanProductsApi.list({ active: true, per_page: 100 }),
        loansApi.options(),
      ])
      if (disposed || current !== loadSequence) return
      products.value = listedProducts.data
      options.value = workflowOptions
      if (editingId.value) {
        const loan = await loansApi.show(editingId.value)
        if (disposed || current !== loadSequence) return
        if (!loan.available_actions?.includes('edit'))
          throw new Error(
            'This application can no longer be edited. Open the saved application to continue its workflow.',
          )
        if (loan.product && !products.value.some((item) => item.id === loan.product?.id))
          products.value.push(loan.product)
        member.value = loan.borrower ?? null
        Object.assign(form, {
          application_data: { ...blankApplication(), ...(loan.application_data ?? {}) },
          charges: (loan.charges ?? []).map(({ name, amount, frequency, collection, chart_of_account_id }) => ({ name, amount, frequency, collection, chart_of_account_id })),
          loan_product_id: loan.loan_product_id,
          loan_officer_id: loan.loan_officer_id,
          commission_member_id: loan.commission_member_id,
          interest_method: loan.interest_method ?? loan.product?.interest_method ?? 'flat',
          principal: loan.principal,
          term: loan.term,
          purpose: loan.purpose ?? '',
          repayment_source: loan.repayment_source ?? '',
          collaterals: (loan.collaterals ?? []).map(({ asset_type, description, estimated_value, notes }) => ({
            asset_type,
            description,
            estimated_value,
            notes: notes ?? '',
          })),
          guarantors: (loan.guarantors ?? []).map(({ member_id, guaranteed_amount }) => ({
            member_id,
            guaranteed_amount,
          })),
        })
        guarantorNames.value = Object.fromEntries(
          (loan.guarantors ?? []).map((item) => [item.member_id, item.member.name]),
        )
      }
    } catch (error) {
      loadingError.value = error instanceof Error ? error.message : 'Could not load the application form.'
    } finally {
      if (current === loadSequence) loading.value = false
    }
  }
  watch(
    () => form.loan_product_id,
    () => {
      if (!editingId.value && !loading.value && product.value) form.term = product.value.max_term
    },
  )
  function validate(target: number): boolean {
    const found: Record<string, string[]> = {}
    if (!member.value) found.member_id = ['Select an active member.']
    if (!product.value) found.loan_product_id = ['Select a loan product.']
    if (!form.loan_officer_id) found.loan_officer_id = ['Assign a loan officer.']
    if (target >= 2) {
      const amount = Number(form.principal)
      const term = Number(form.term)
      if (!Number.isFinite(amount) || amount <= 0) found.principal = ['Enter an amount greater than zero.']
      else if (
        product.value &&
        (amount < Number(product.value.min_amount) ||
          (product.value.max_amount !== null && amount > Number(product.value.max_amount)))
      )
        found.principal = ['The amount must be within this product’s limits.']
      if (
        !Number.isInteger(term) ||
        term < 1 ||
        (product.value && (term < product.value.min_term || term > product.value.max_term))
      )
        found.term = ['Enter a whole number of periods within this product’s limits.']
      if (!form.purpose.trim()) found.purpose = ['Describe the purpose of the loan.']
      if (form.guarantors.some((item) => item.member_id === member.value?.id))
        found.guarantors = ['The borrower cannot guarantee their own loan.']
    }
    errors.value = found
    if (Object.keys(found).length) {
      message.value = 'Please correct the highlighted details.'
      return false
    }
    message.value = ''
    return true
  }
  function goTo(target: number): void {
    if (busy.value) return
    if (target < step.value || validate(target - 1)) step.value = target
  }
  async function refresh(): Promise<void> {
    const current = ++sequence
    preview.value = null
    eligibility.value = null
    previewError.value = ''
    eligibilityError.value = ''
    if (
      !product.value ||
      !member.value ||
      !(Number(form.principal) > 0) ||
      !Number.isInteger(Number(form.term)) ||
      !(Number(form.term) > 0)
    ) {
      checking.value = false
      return
    }
    checking.value = true
    const results = await Promise.allSettled([
      loanProductsApi.preview({
        ...product.value,
        interest_method: form.interest_method,
        preview_amount: Number(form.principal),
        preview_term: Number(form.term),
      }),
      loansApi.eligibility(payload()),
    ])
    if (current !== sequence || disposed) return
    if (results[0].status === 'fulfilled') preview.value = results[0].value
    else previewError.value = 'The repayment preview could not be calculated. Try again.'
    if (results[1].status === 'fulfilled') eligibility.value = results[1].value
    else eligibilityError.value = 'Eligibility could not be checked. Try again before submitting.'
    checking.value = false
  }
  watch(
    [
      () => member.value?.id,
      () => form.loan_product_id,
      () => form.principal,
      () => form.interest_method,
      () => form.term,
      () => form.collaterals,
      () => form.guarantors,
    ],
    () => {
      ++sequence
      clearTimeout(timer)
      preview.value = null
      eligibility.value = null
      checking.value = false
      timer = setTimeout(refresh, 350)
    },
    { deep: true },
  )
  async function save(submit: boolean): Promise<void> {
    if (busy.value || !validate(2)) {
      if (Object.keys(errors.value).some((key) => ['member_id', 'loan_product_id', 'loan_officer_id'].includes(key)))
        step.value = 1
      else step.value = 2
      return
    }
    if (submit && (!eligibility.value?.eligible || checking.value)) {
      message.value = 'Resolve the eligibility checks before submitting. You can still save a draft.'
      return
    }
    busy.value = true
    errors.value = {}
    message.value = ''
    let savedId: number | null = null
    try {
      const loan = editingId.value
        ? await loansApi.update(editingId.value, payload())
        : await loansApi.create(payload())
      savedId = loan.id
      if (submit) await loansApi.workflow(loan.id, 'submit')
      await router.push({
        name: 'loans.show',
        params: { id: loan.id },
        query: { saved: submit ? 'submitted' : 'draft' },
      })
    } catch (error) {
      if (savedId) {
        await router.replace({
          name: 'loans.show',
          params: { id: savedId },
          query: {
            warning:
              'The draft was saved, but submission was not completed. ' +
              (error instanceof Error ? error.message : 'Review the application and try again.'),
          },
        })
      } else {
        if (error instanceof ApiError) errors.value = error.errors
        message.value = error instanceof Error ? error.message : 'The application could not be saved.'
        step.value = Object.keys(errors.value).some((key) =>
          ['member_id', 'loan_product_id', 'loan_officer_id'].includes(key),
        )
          ? 1
          : 2
      }
    } finally {
      busy.value = false
    }
  }
  watch(editingId, () => {
    member.value = null
    step.value = 1
    message.value = ''
    errors.value = {}
    Object.assign(form, {
      application_data: blankApplication(),
      charges: [],
      loan_product_id: null,
      loan_officer_id: null,
      principal: '',
      term: '',
      purpose: '',
      repayment_source: '',
      collaterals: [],
      guarantors: [],
    })
    guarantorNames.value = {}
    void load()
  })
  onMounted(load)
  onBeforeUnmount(() => {
    disposed = true
    ++sequence
    clearTimeout(timer)
  })
  return {
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
  }
}
