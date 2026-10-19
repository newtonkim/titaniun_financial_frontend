import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/core/api/http'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { AccountType, ChartOfAccount } from '@/modules/accounting/types'
import { loanProductsApi } from '../api'
import type { LoanProduct, LoanProductAccountField, LoanProductPreview, LoanProductSettings } from '../types'

export interface AccountFieldMeta {
  field: LoanProductAccountField
  type: AccountType
  label: string
  placeholder: string
}

/** The Accounting Mapping section's ledger account fields, in display order. */
export const ACCOUNT_FIELDS: readonly AccountFieldMeta[] = [
  { field: 'loan_portfolio_account_id', type: 'asset', label: 'Loan Portfolio Account', placeholder: 'Select loan portfolio account' },
  { field: 'interest_income_account_id', type: 'income', label: 'Interest Income Account', placeholder: 'Select interest income account' },
  { field: 'interest_receivable_account_id', type: 'asset', label: 'Interest Receivable Account', placeholder: 'Select interest receivable account' },
  { field: 'disbursement_account_id', type: 'asset', label: 'Disbursement Account', placeholder: 'Select disbursement account' },
  { field: 'penalty_income_account_id', type: 'income', label: 'Penalty Income Account', placeholder: 'Select penalty income account' },
  { field: 'penalty_receivable_account_id', type: 'asset', label: 'Penalty Receivable Account', placeholder: 'Select penalty receivable account' },
  { field: 'charges_income_account_id', type: 'income', label: 'Charges Income Account', placeholder: 'Select charges income account' },
  { field: 'charges_receivable_account_id', type: 'asset', label: 'Charges Receivable Account', placeholder: 'Select charges receivable account' },
]

/** Words an account's name or subtype must contain to be suggested for a field: one from each group. */
const SUGGESTION_KEYWORDS: Record<LoanProductAccountField, string[][]> = {
  loan_portfolio_account_id: [['loan', 'portfolio']],
  interest_income_account_id: [['interest']],
  interest_receivable_account_id: [['interest'], ['receivable']],
  disbursement_account_id: [['bank', 'cash']],
  penalty_income_account_id: [['penalty', 'fine']],
  penalty_receivable_account_id: [['penalty'], ['receivable']],
  charges_income_account_id: [['charge', 'fee']],
  charges_receivable_account_id: [['charge'], ['receivable']],
}

function createDefaultForm(): LoanProductSettings {
  return {
    code: '',
    name: '',
    description: '',
    min_amount: null,
    max_amount: null,
    interest_rate: null,
    interest_method: null,
    interest_period: 'per_month',
    repayment_structure: 'equal_installment',
    max_term: null,
    duration_type: 'months',
    repayment_frequency: 'monthly',
    grace_period: 0,
    warning_days: null,
    processing_fee_type: 'none',
    processing_fee_value: 0,
    penalty_type: 'none',
    penalty_rate: 0,
    penalty_grace_days: 0,
    savings_appraisal_threshold: 0,
    max_securities: 3,
    security_value_percentage: 150,
    loan_portfolio_account_id: null,
    interest_income_account_id: null,
    interest_receivable_account_id: null,
    disbursement_account_id: null,
    penalty_income_account_id: null,
    penalty_receivable_account_id: null,
    charges_income_account_id: null,
    charges_receivable_account_id: null,
    is_active: false,
  }
}

/** Create or edit a loan product, with a live repayment preview. */
export function useLoanProductForm() {
  const route = useRoute()
  const router = useRouter()

  const isEditing = computed(() => !!route.params.id)
  const loading = ref(false)
  const saving = ref(false)
  const previewLoading = ref(false)
  const errors = ref<Record<string, string[]>>({})
  const message = ref('')
  const preview = ref<LoanProductPreview | null>(null)
  const previewAmount = ref<number | null>(null)
  const previewTerm = ref<number | null>(null)
  const form = ref<LoanProductSettings>(createDefaultForm())
  const loanCount = ref(0)
  const isInUse = ref(false)
  let previewTimer: ReturnType<typeof setTimeout> | null = null

  // ─── Accounts (for the accounting mapping selectors) ──────────────────────
  const postableAccounts = ref<ChartOfAccount[]>([])
  const accountsByType = computed(() => {
    const options = (type: AccountType) =>
      postableAccounts.value.filter((a) => a.type === type).map((a) => ({ id: a.id, name: `${a.code} - ${a.name}` }))
    return { asset: options('asset'), income: options('income') } as Record<AccountType, { id: number; name: string }[]>
  })

  async function fetchAccounts() {
    try {
      const response = await chartOfAccountsApi.list({ is_active: true })
      postableAccounts.value = response.data.filter((a) => a.is_postable && a.is_active)
    } catch {
      message.value = 'Failed to load chart of accounts.'
    }
  }

  /** Suggest an account for each empty mapping from its name; never replaces a choice already made. */
  function autoFillAccounts() {
    for (const meta of ACCOUNT_FIELDS) {
      if (form.value[meta.field] != null) continue
      const keywords = SUGGESTION_KEYWORDS[meta.field]
      const found = postableAccounts.value.find((a) => {
        if (a.type !== meta.type) return false
        const hay = `${a.name} ${a.subtype ?? ''}`.toLowerCase()
        return keywords.every((group) => group.some((kw) => hay.includes(kw)))
      })
      if (found) form.value[meta.field] = found.id
    }
  }

  // ─── Fees ─────────────────────────────────────────────────────────────────
  /** The processing fee on the preview amount, for the total cost of credit. */
  const estimatedFees = computed(() => {
    const amount = Number(previewAmount.value || form.value.min_amount || 0)
    const value = Number(form.value.processing_fee_value || 0)
    const fee =
      form.value.processing_fee_type === 'percentage' ? (value / 100) * amount
        : form.value.processing_fee_type === 'flat' ? value
          : 0
    const breakdown = fee > 0 ? [{ name: 'Processing fee', amount: fee }] : []
    return { totalFees: fee, breakdown }
  })

  // ─── Load (edit mode) ─────────────────────────────────────────────────────
  async function loadProduct() {
    if (!isEditing.value) return
    loading.value = true
    try {
      const product: LoanProduct = await loanProductsApi.show(Number(route.params.id))
      const defaults = createDefaultForm()
      const loaded = Object.fromEntries(
        Object.keys(defaults).map((key) => [key, product[key as keyof LoanProductSettings] ?? defaults[key as keyof LoanProductSettings]]),
      ) as unknown as LoanProductSettings
      form.value = loaded
      loanCount.value = product.loan_count ?? 0
      isInUse.value = product.is_in_use ?? false
      previewAmount.value = Number(product.min_amount ?? 0) || null
      previewTerm.value = product.max_term ?? null
    } catch {
      void router.push({ name: 'loans.products' })
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    await Promise.all([loadProduct(), fetchAccounts()])
    autoFillAccounts()
  })

  function fieldError(field: string): string | null {
    return errors.value[field]?.[0] ?? null
  }

  // ─── Preview ──────────────────────────────────────────────────────────────
  function shouldPreview() {
    return !!form.value.interest_method && !!form.value.max_term && !!previewAmount.value
  }

  async function refreshPreview() {
    if (!shouldPreview()) {
      preview.value = null
      return
    }
    previewLoading.value = true
    try {
      preview.value = await loanProductsApi.preview({
        ...form.value,
        preview_amount: previewAmount.value,
        preview_term: previewTerm.value ?? form.value.max_term,
      })
    } catch {
      preview.value = null
    } finally {
      previewLoading.value = false
    }
  }

  // The code follows the name until the product is saved.
  watch(
    () => form.value.name,
    (name) => {
      if (isEditing.value) return
      form.value.code = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)
    },
  )

  watchEffect(() => {
    if (form.value.max_term && !previewTerm.value) previewTerm.value = form.value.max_term
  })

  watch(
    () => form.value.max_term,
    (value) => {
      previewTerm.value = value ?? null
    },
  )

  watch(
    [
      () => form.value.min_amount,
      () => form.value.interest_rate,
      () => form.value.interest_method,
      () => form.value.repayment_structure,
      () => form.value.interest_period,
      () => form.value.max_term,
      () => form.value.repayment_frequency,
      previewAmount,
      previewTerm,
    ],
    () => {
      if (previewTimer) clearTimeout(previewTimer)
      previewTimer = setTimeout(() => void refreshPreview(), 250)
    },
  )

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function save() {
    saving.value = true
    errors.value = {}
    message.value = ''
    try {
      if (isEditing.value) {
        await loanProductsApi.update(Number(route.params.id), form.value)
      } else {
        await loanProductsApi.create(form.value)
      }
      void router.push({ name: 'loans.products' })
    } catch (e) {
      if (e instanceof ApiError && e.isValidation) {
        errors.value = e.errors
        message.value = 'Please correct the highlighted fields.'
      } else {
        message.value = e instanceof ApiError ? e.message : 'Failed to save loan product.'
      }
    } finally {
      saving.value = false
    }
  }

  return {
    isEditing, loading, saving, errors, message, form, loanCount, isInUse,
    accountsByType, estimatedFees,
    preview, previewLoading, previewAmount, previewTerm,
    fieldError, save,
  }
}
