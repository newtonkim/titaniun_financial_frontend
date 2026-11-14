<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ImagePlus, PiggyBank, UserPlus, UserRound, Users } from 'lucide-vue-next'
import { ApiError, type ValidationErrors } from '@/core/api/http'
import AppDrawer from '@/core/components/AppDrawer.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { formatEnum, formatMoney, today } from '@/core/utils/format'
import { savingsProductsApi } from '@/modules/savings/api'
import { shareProductsApi } from '@/modules/shares/api'
import type { ShareProduct } from '@/modules/shares/types'
import { memberSettingsApi, membersApi } from '../api'
import {
  EDITABLE_STATUSES,
  GENDERS,
  MARITAL_STATUSES,
  SALUTATIONS,
  type Gender,
  type MaritalStatus,
  type Member,
  type MemberCategory,
  type MemberSettings,
  type MemberStatus,
  type MemberType,
} from '../types'

/** Register (`memberId` null) or edit a member in a right-hand drawer. */
const props = withDefaults(defineProps<{ memberId: number | null; category?: MemberCategory }>(), { category: 'member' })
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [member: Member] }>()

const isEditing = computed(() => props.memberId !== null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errors = ref<ValidationErrors>({})

const savingsProducts = ref<{ id: number; name: string }[]>([])
const shareProducts = ref<ShareProduct[]>([])
/**
 * Adding a free agent, or changing a member into one, takes a new code with a fixed prefix;
 * `form.member_number` then holds only what staff type after it.
 */
const codeSettings = ref<MemberSettings>({ code_prefix: 'FA', code_length: 8, savings_product_id: null })
const codePrefix = computed(() => `${codeSettings.value.code_prefix}-`)
const savedCategory = ref<MemberCategory | null>(null)
const savedCode = ref('')
const becomesFreeAgent = computed(() => isEditing.value && savedCategory.value === 'member' && form.category === 'free_agent')
const typesFreeAgentCode = computed(() => form.category === 'free_agent' && (!isEditing.value || becomesFreeAgent.value))

// Switching an existing member to free agent swaps their old code for the new prefix; switching back restores it.
watch(becomesFreeAgent, (becomes) => {
  form.member_number = becomes ? '' : savedCode.value
})

const blank = () => ({
  applicant_type: 'individual' as 'individual' | 'business',
  employer: '',
  occupation: '',
  district: '',
  business_registration_number: '',
  business_activity: '',
  signatory_name: '',
  signatory_title: '',
  signatory_national_id: '',
  member_type: 'new_member' as MemberType,
  category: props.category,
  name: '',
  member_number: '',
  salutation: '',
  gender: null as Gender | null,
  date_of_birth: '',
  marital_status: null as MaritalStatus | null,
  nationality: 'Ugandan',
  address: '',
  national_id: '',
  phone: '',
  other_contact: '',
  mobile_money_number: '',
  email: '',
  next_of_kin: '',
  next_of_kin_contact: '',
  is_shareholder: false,
  joined_at: today(),
  status: 'active' as MemberStatus,
  savings_product_id: null as number | null,
  initial_deposit: null as number | null,
  opening_balance: null as number | null,
  share_product_id: null as number | null,
  shares_quantity: null as number | null,
})

const form = reactive(blank())
const CATEGORIES = [
  { value: 'member', label: 'Member', hint: 'Saves and can take loans', icon: Users },
  { value: 'free_agent', label: 'Free agent', hint: 'Only saves, no loans', icon: PiggyBank },
] as const
const businessFields = [
  { key: 'business_registration_number', label: 'Registration / incorporation number' },
  { key: 'business_activity', label: 'Nature of business' },
  { key: 'signatory_name', label: 'Authorized signatory' },
  { key: 'signatory_title', label: 'Signatory designation' },
  { key: 'signatory_national_id', label: 'Signatory NIN' },
] as const
const avatar = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)

const shareProduct = computed(() => shareProducts.value.find((product) => product.id === form.share_product_id) ?? null)
const shareTotal = computed(() =>
  shareProduct.value && form.shares_quantity ? Number(shareProduct.value.nominal_price) * form.shares_quantity : 0,
)
const maxBirthDate = computed(() => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  return date.toISOString().slice(0, 10)
})

const fieldError = (field: string): string | undefined => errors.value[field]?.[0]

async function load(): Promise<void> {
  savedCategory.value = null
  Object.assign(form, blank())
  avatar.value = null
  avatarPreview.value = null
  message.value = ''
  errors.value = {}
  loading.value = true

  try {
    codeSettings.value = await memberSettingsApi.show()
    if (props.memberId !== null) {
      const member = await membersApi.show(props.memberId)
      savedCategory.value = member.category
      savedCode.value = member.member_number
      Object.assign(form, {
        applicant_type: member.applicant_type ?? 'individual',
        employer: member.employer ?? '',
        occupation: member.occupation ?? '',
        district: member.district ?? '',
        business_registration_number: member.business_registration_number ?? '',
        business_activity: member.business_activity ?? '',
        signatory_name: member.signatory_name ?? '',
        signatory_title: member.signatory_title ?? '',
        signatory_national_id: member.signatory_national_id ?? '',
        member_type: member.member_type,
        category: member.category,
        name: member.name,
        member_number: member.member_number,
        salutation: member.salutation ?? '',
        gender: member.gender,
        date_of_birth: member.date_of_birth ?? '',
        marital_status: member.marital_status,
        nationality: member.nationality ?? '',
        address: member.address ?? '',
        national_id: member.national_id ?? '',
        phone: member.phone,
        other_contact: member.other_contact ?? '',
        mobile_money_number: member.mobile_money_number ?? '',
        email: member.email ?? '',
        next_of_kin: member.next_of_kin ?? '',
        next_of_kin_contact: member.next_of_kin_contact ?? '',
        is_shareholder: member.is_shareholder,
        joined_at: member.joined_at,
        status: member.status,
      })
      avatarPreview.value = member.avatar_url
    } else {
      const [savings, shares] = await Promise.all([
        savingsProductsApi.list({ active: true, per_page: 100 }),
        shareProductsApi.list({ active: true }),
      ])
      savingsProducts.value = savings.data.map((product) => ({ id: product.id, name: product.name }))
      shareProducts.value = shares.data
    }
  } catch {
    message.value = 'Failed to load the member form.'
  } finally {
    loading.value = false
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) void load()
  },
  { immediate: true },
)

function pickAvatar(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  avatar.value = file
  avatarPreview.value = file ? URL.createObjectURL(file) : null
}

const nullable = (value: string): string | null => (value.trim() === '' ? null : value.trim())

function detailsPayload() {
  return {
    applicant_type: form.applicant_type,
    employer: nullable(form.employer),
    occupation: nullable(form.occupation),
    district: nullable(form.district),
    business_registration_number: nullable(form.business_registration_number),
    business_activity: nullable(form.business_activity),
    signatory_name: nullable(form.signatory_name),
    signatory_title: nullable(form.signatory_title),
    signatory_national_id: nullable(form.signatory_national_id),
    name: form.name.trim(),
    member_number: nullable(form.member_number),
    salutation: nullable(form.salutation),
    gender: form.gender,
    date_of_birth: nullable(form.date_of_birth),
    marital_status: form.marital_status,
    nationality: form.nationality.trim(),
    address: form.address.trim(),
    national_id: nullable(form.national_id),
    phone: form.phone.trim(),
    other_contact: nullable(form.other_contact),
    mobile_money_number: nullable(form.mobile_money_number),
    email: nullable(form.email),
    next_of_kin: nullable(form.next_of_kin),
    next_of_kin_contact: nullable(form.next_of_kin_contact),
    is_shareholder: form.is_shareholder,
    joined_at: nullable(form.joined_at),
    category: form.category,
  }
}

async function save(): Promise<void> {
  saving.value = true
  message.value = ''
  errors.value = {}

  try {
    let member =
      props.memberId !== null
        ? await membersApi.update(props.memberId, {
            ...detailsPayload(),
            ...(typesFreeAgentCode.value ? { member_number: codePrefix.value + form.member_number.trim().toUpperCase() } : {}),
            member_type: form.member_type,
            status: form.status,
          })
        : await membersApi.create({
            ...detailsPayload(),
            ...(typesFreeAgentCode.value ? { member_number: codePrefix.value + form.member_number.trim().toUpperCase() } : {}),
            member_type: form.member_type,
            savings_product_id: form.savings_product_id,
            initial_deposit: form.member_type === 'new_member' ? form.initial_deposit : null,
            opening_balance: form.member_type === 'existing_member' ? form.opening_balance : null,
            share_product_id: form.shares_quantity ? form.share_product_id : null,
            shares_quantity: form.shares_quantity || null,
          })

    if (avatar.value) member = await membersApi.uploadAvatar(member.id, avatar.value)

    emit('saved', member)
    open.value = false
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors
      message.value = 'Please correct the highlighted fields.'
    } else {
      message.value = e instanceof ApiError ? e.message : 'Failed to save the member.'
    }
  } finally {
    saving.value = false
  }
}

const input = 'w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground'
const inputClass = (field: string) => [
  input,
  fieldError(field) ? 'border-red-400 dark:border-red-500' : 'border-border',
]
const card = 'rounded-lg border border-border bg-background p-6'
const heading = 'mb-4 text-lg font-semibold text-foreground'
const label = 'mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300'
const errorText = 'mt-1 text-xs text-red-500'
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="isEditing ? (form.category === 'free_agent' ? 'Edit free agent' : 'Edit member') : (form.category === 'free_agent' ? 'Add a free agent' : 'Add a member')"
    width="w-full lg:w-2/3"
    :loading="saving"
    :save-disabled="loading"
    :save-button-text="isEditing ? 'Update' : 'Create'"
    @save="save"
  >
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 py-24">
      <span
        class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand border-r-transparent"
        aria-hidden="true"
      />
      <span class="text-sm font-medium text-muted-foreground">Loading details...</span>
    </div>

    <div v-else class="flex flex-col gap-6">
      <p
        v-if="message"
        role="alert"
        class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
      >
        {{ message }}
      </p>

      <!-- Identity -->
      <div :class="card">
        <h2 :class="heading">Member Identity</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <p :class="label">Member Type <span class="text-red-500">*</span></p>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="type in ['new_member', 'existing_member'] as const"
                :key="type"
                type="button"
                :disabled="isEditing"
                :class="[
                  'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  form.member_type === type
                    ? 'border-brand bg-brand/5 font-semibold text-brand'
                    : 'border-border text-neutral-600 hover:border-neutral-300 dark:text-neutral-300',
                ]"
                @click="form.member_type = type"
              >
                <component :is="type === 'new_member' ? UserPlus : UserRound" class="h-5 w-5 shrink-0" />
                <span>
                  {{ type === 'new_member' ? 'New Member' : 'Existing Member' }}
                  <span class="block text-xs font-normal text-muted-foreground">
                    {{ type === 'new_member' ? 'Joining the sacco today' : 'Migrating with a savings balance' }}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div class="sm:col-span-2">
            <p :class="label">Category <span class="text-red-500">*</span></p>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="option in CATEGORIES"
                :key="option.value"
                type="button"
                :class="[
                  'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                  form.category === option.value
                    ? 'border-brand bg-brand/5 font-semibold text-brand'
                    : 'border-border text-neutral-600 hover:border-neutral-300 dark:text-neutral-300',
                ]"
                @click="form.category = option.value"
              >
                <component :is="option.icon" class="h-5 w-5 shrink-0" />
                <span>
                  {{ option.label }}
                  <span class="block text-xs font-normal text-muted-foreground">{{ option.hint }}</span>
                </span>
              </button>
            </div>
            <p v-if="fieldError('category')" :class="errorText">{{ fieldError('category') }}</p>
          </div>

          <div class="sm:col-span-2">
            <label :class="label" for="m-name"
              >{{ form.applicant_type === 'business' ? 'Registered business name' : 'Full Name' }}
              <span class="text-red-500">*</span></label
            >
            <input
              id="m-name"
              v-model="form.name"
              type="text"
              :class="inputClass('name')"
              placeholder="e.g. Grace Namutebi"
            />
            <p v-if="fieldError('name')" :class="errorText">{{ fieldError('name') }}</p>
          </div>
        </div>
      </div>

      <!-- Savings (registration only) -->
      <div v-if="!isEditing" :class="card">
        <h2 :class="heading">Savings Account</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <p :class="label">Savings Product</p>
            <SearchableSelect
              v-model="form.savings_product_id"
              :options="savingsProducts"
              placeholder="— select savings product —"
              :error="fieldError('savings_product_id')"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              A savings account is opened on this product when the member is saved.
            </p>
          </div>

          <div v-if="form.member_type === 'new_member'">
            <label :class="label" for="m-initial-deposit">Initial Deposit</label>
            <input
              id="m-initial-deposit"
              v-model.number="form.initial_deposit"
              type="number"
              min="0"
              step="0.01"
              :class="inputClass('initial_deposit')"
              placeholder="0.00"
            />
            <p v-if="fieldError('initial_deposit')" :class="errorText">
              {{ fieldError('initial_deposit') }}
            </p>
          </div>

          <template v-else>
            <div>
              <label :class="label" for="m-opening-balance">Opening Balance <span class="text-red-500">*</span></label>
              <input
                id="m-opening-balance"
                v-model.number="form.opening_balance"
                type="number"
                min="0"
                step="0.01"
                :class="inputClass('opening_balance')"
                placeholder="0.00"
              />
              <p v-if="fieldError('opening_balance')" :class="errorText">
                {{ fieldError('opening_balance') }}
              </p>
            </div>
            <label class="flex items-center gap-3 self-end pb-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                v-model="form.is_shareholder"
                type="checkbox"
                class="h-4 w-4 rounded border-border accent-brand"
              />
              Already a shareholder
            </label>
          </template>
        </div>
      </div>

      <!-- Share purchase (registration only) -->
      <div v-if="!isEditing" :class="card">
        <h2 :class="heading">Share Purchase</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="sm:col-span-2">
            <label :class="label" for="m-share-product">Share Product</label>
            <select id="m-share-product" v-model="form.share_product_id" :class="inputClass('share_product_id')">
              <option :value="null">— no shares —</option>
              <option v-for="product in shareProducts" :key="product.id" :value="product.id">
                {{ product.name }} · {{ formatMoney(product.nominal_price) }} per share
              </option>
            </select>
            <p v-if="fieldError('share_product_id')" :class="errorText">
              {{ fieldError('share_product_id') }}
            </p>
          </div>
          <div>
            <label :class="label" for="m-shares">Number of Shares</label>
            <input
              id="m-shares"
              v-model.number="form.shares_quantity"
              type="number"
              min="1"
              step="1"
              :disabled="!form.share_product_id"
              :class="inputClass('shares_quantity')"
              placeholder="0"
            />
            <p v-if="fieldError('shares_quantity')" :class="errorText">
              {{ fieldError('shares_quantity') }}
            </p>
          </div>
          <div
            v-if="shareProduct"
            class="flex items-center justify-between rounded-lg bg-navy/5 px-4 py-3 sm:col-span-3 dark:bg-white/5"
          >
            <span class="text-sm text-neutral-600 dark:text-neutral-300">Total investment</span>
            <span class="text-lg font-bold text-navy dark:text-white">{{ formatMoney(shareTotal) }}</span>
          </div>
        </div>
      </div>

      <div :class="card">
        <h2 :class="heading">Client application details</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label :class="label" for="m-applicant-type">Client type</label
            ><select id="m-applicant-type" v-model="form.applicant_type" :class="inputClass('applicant_type')">
              <option value="individual">Individual</option>
              <option value="business">Business / company</option>
            </select>
          </div>
          <div>
            <label :class="label" for="m-district">Town / division / district</label
            ><input id="m-district" v-model="form.district" :class="inputClass('district')" maxlength="255" />
            <p v-if="fieldError('district')" :class="errorText">{{ fieldError('district') }}</p>
          </div>
          <template v-if="form.applicant_type === 'business'"
            ><div v-for="field in businessFields" :key="field.key">
              <label :class="label" :for="`m-${field.key}`">{{ field.label }}</label
              ><input :id="`m-${field.key}`" v-model="form[field.key]" :class="inputClass(field.key)" maxlength="255" />
              <p v-if="fieldError(field.key)" :class="errorText">{{ fieldError(field.key) }}</p>
            </div></template
          >
          <template v-else
            ><div>
              <label :class="label" for="m-employer">Employer / place of work</label
              ><input id="m-employer" v-model="form.employer" :class="inputClass('employer')" maxlength="255" />
            </div>
            <div>
              <label :class="label" for="m-occupation">Occupation / profession</label
              ><input
                id="m-occupation"
                v-model="form.occupation"
                :class="inputClass('occupation')"
                maxlength="255"
              /></div
          ></template>
        </div>
      </div>

      <!-- Personal -->
      <div :class="card">
        <h2 :class="heading">Membership details</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label :class="label" for="m-number">Member Code<template v-if="typesFreeAgentCode"> *</template></label>
            <div v-if="typesFreeAgentCode" class="flex">
              <span class="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-muted px-3 font-mono text-sm text-muted-foreground">{{ codePrefix }}</span>
              <input
                id="m-number"
                v-model="form.member_number"
                type="text"
                required
                :minlength="codeSettings.code_length"
                :maxlength="codeSettings.code_length"
                pattern="[A-Za-z0-9]+"
                :title="`${codeSettings.code_length} letters or digits`"
                :class="[inputClass('member_number'), 'rounded-l-none font-mono uppercase']"
                :placeholder="'X'.repeat(codeSettings.code_length)"
                autocomplete="off"
              />
            </div>
            <input
              v-else
              id="m-number"
              v-model="form.member_number"
              type="text"
              :class="inputClass('member_number')"
              placeholder="Generated when left blank"
            />
            <p v-if="typesFreeAgentCode && !fieldError('member_number')" class="mt-1 text-xs text-muted-foreground">Type {{ codeSettings.code_length }} letters or digits after {{ codePrefix }}</p>
            <p v-if="becomesFreeAgent" class="mt-1 text-xs text-muted-foreground">
              Their accounts are renumbered from the new code<template v-if="codeSettings.savings_product_id">, and their open savings accounts move to the free agent savings product</template>.
            </p>
            <p v-if="fieldError('member_number')" :class="errorText">{{ fieldError('member_number') }}</p>
          </div>
          <div>
            <label :class="label" for="m-salutation">Salutation</label>
            <select id="m-salutation" v-model="form.salutation" :class="inputClass('salutation')">
              <option value="">—</option>
              <option v-for="salutation in SALUTATIONS" :key="salutation" :value="salutation">
                {{ salutation }}
              </option>
            </select>
          </div>
          <div>
            <label :class="label" for="m-gender"
              >Gender <span v-if="form.applicant_type === 'individual'" class="text-red-500">*</span></label
            >
            <select id="m-gender" v-model="form.gender" :class="inputClass('gender')">
              <option :value="null" disabled>Select gender</option>
              <option v-for="gender in GENDERS" :key="gender" :value="gender">
                {{ formatEnum(gender) }}
              </option>
            </select>
            <p v-if="fieldError('gender')" :class="errorText">{{ fieldError('gender') }}</p>
          </div>
          <div>
            <label :class="label" for="m-dob">Date of Birth</label>
            <input
              id="m-dob"
              v-model="form.date_of_birth"
              type="date"
              :max="maxBirthDate"
              :class="inputClass('date_of_birth')"
            />
            <p v-if="fieldError('date_of_birth')" :class="errorText">{{ fieldError('date_of_birth') }}</p>
          </div>
          <div>
            <label :class="label" for="m-marital"
              >Marital Status <span v-if="form.applicant_type === 'individual'" class="text-red-500">*</span></label
            >
            <select id="m-marital" v-model="form.marital_status" :class="inputClass('marital_status')">
              <option :value="null" disabled>Select status</option>
              <option v-for="status in MARITAL_STATUSES" :key="status" :value="status">
                {{ formatEnum(status) }}
              </option>
            </select>
            <p v-if="fieldError('marital_status')" :class="errorText">{{ fieldError('marital_status') }}</p>
          </div>
          <div v-if="isEditing">
            <label :class="label" for="m-status">Status</label>
            <select
              id="m-status"
              v-model="form.status"
              :class="inputClass('status')"
              :disabled="!EDITABLE_STATUSES.includes(form.status)"
            >
              <option v-if="!EDITABLE_STATUSES.includes(form.status)" :value="form.status">
                {{ formatEnum(form.status) }}
              </option>
              <option v-for="status in EDITABLE_STATUSES" :key="status" :value="status">
                {{ formatEnum(status) }}
              </option>
            </select>
            <p v-if="fieldError('status')" :class="errorText">{{ fieldError('status') }}</p>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div :class="card">
        <h2 :class="heading">Contact Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label :class="label" for="m-phone">Primary Contact <span class="text-red-500">*</span></label>
            <input id="m-phone" v-model="form.phone" type="tel" :class="inputClass('phone')" placeholder="07XXXXXXXX" />
            <p v-if="fieldError('phone')" :class="errorText">{{ fieldError('phone') }}</p>
          </div>
          <div>
            <label :class="label" for="m-other">Other Contact</label>
            <input id="m-other" v-model="form.other_contact" type="tel" :class="inputClass('other_contact')" />
            <p v-if="fieldError('other_contact')" :class="errorText">{{ fieldError('other_contact') }}</p>
          </div>
          <div>
            <label :class="label" for="m-momo">Mobile Money Number</label>
            <input
              id="m-momo"
              v-model="form.mobile_money_number"
              type="tel"
              :class="inputClass('mobile_money_number')"
            />
            <p v-if="fieldError('mobile_money_number')" :class="errorText">
              {{ fieldError('mobile_money_number') }}
            </p>
          </div>
          <div>
            <label :class="label" for="m-email">Email</label>
            <input id="m-email" v-model="form.email" type="email" :class="inputClass('email')" />
            <p v-if="fieldError('email')" :class="errorText">{{ fieldError('email') }}</p>
          </div>
          <div>
            <label :class="label" for="m-nin">National ID (NIN)</label>
            <input id="m-nin" v-model="form.national_id" type="text" :class="inputClass('national_id')" />
            <p v-if="fieldError('national_id')" :class="errorText">{{ fieldError('national_id') }}</p>
          </div>
          <div>
            <label :class="label" for="m-nationality">Nationality <span class="text-red-500">*</span></label>
            <input id="m-nationality" v-model="form.nationality" type="text" :class="inputClass('nationality')" />
            <p v-if="fieldError('nationality')" :class="errorText">{{ fieldError('nationality') }}</p>
          </div>
          <div class="sm:col-span-2">
            <label :class="label" for="m-address">Address <span class="text-red-500">*</span></label>
            <textarea id="m-address" v-model="form.address" rows="2" :class="inputClass('address')" />
            <p v-if="fieldError('address')" :class="errorText">{{ fieldError('address') }}</p>
          </div>
        </div>
      </div>

      <!-- Other -->
      <div :class="card">
        <h2 :class="heading">Other Details</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex items-center gap-4 sm:col-span-2">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy/10 text-navy dark:text-white"
            >
              <img
                v-if="avatarPreview"
                :src="avatarPreview"
                alt="Profile picture preview"
                class="h-full w-full object-cover"
              />
              <ImagePlus v-else class="h-6 w-6" />
            </div>
            <div>
              <label :class="label" for="m-avatar">Profile Picture</label>
              <input
                id="m-avatar"
                type="file"
                accept="image/*"
                class="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-neutral-300 dark:file:bg-neutral-800"
                @change="pickAvatar"
              />
              <p v-if="fieldError('avatar')" :class="errorText">{{ fieldError('avatar') }}</p>
            </div>
          </div>
          <div>
            <label :class="label" for="m-kin">Next of Kin</label>
            <input id="m-kin" v-model="form.next_of_kin" type="text" :class="inputClass('next_of_kin')" />
          </div>
          <div>
            <label :class="label" for="m-kin-contact">Next of Kin Contact</label>
            <input
              id="m-kin-contact"
              v-model="form.next_of_kin_contact"
              type="tel"
              :class="inputClass('next_of_kin_contact')"
            />
          </div>
          <div>
            <label :class="label" for="m-joined">Joined Date</label>
            <input id="m-joined" v-model="form.joined_at" type="date" :class="inputClass('joined_at')" />
            <p v-if="fieldError('joined_at')" :class="errorText">{{ fieldError('joined_at') }}</p>
          </div>
        </div>
      </div>
    </div>
  </AppDrawer>
</template>
