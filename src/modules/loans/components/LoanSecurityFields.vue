<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue'
import { Plus, ShieldCheck, Trash2, UsersRound } from 'lucide-vue-next'
import { formatMoney } from '@/core/utils/format'
import type { Member } from '@/modules/members/types'
import type { LoanCollateralInput, LoanGuarantorInput, LoanProduct } from '../types'
import LoanMemberPicker from './LoanMemberPicker.vue'
const props = defineProps<{
  product: LoanProduct | null
  amount: number
  borrowerId: number | null
  disabled?: boolean
}>()
const collaterals = defineModel<LoanCollateralInput[]>('collaterals', { required: true })
const guarantors = defineModel<LoanGuarantorInput[]>('guarantors', { required: true })
const guarantorNames = defineModel<Record<number, string>>('guarantorNames', { required: true })
const uid = useId()
const collateral = reactive({ asset_type: 'Land', description: '', estimated_value: '', notes: '' })
const selectedGuarantor = ref<Member | null>(null)
const guaranteeAmount = ref('')
const error = ref('')
const addingCollateral = ref(false)
const addingGuarantor = ref(false)
const required = computed(() => (props.amount * Number(props.product?.security_value_percentage ?? 0)) / 100)
const provided = computed(
  () =>
    collaterals.value.reduce((sum, item) => sum + Number(item.estimated_value), 0) +
    guarantors.value.reduce((sum, item) => sum + Number(item.guaranteed_amount), 0),
)
const countLimitReached = computed(
  () =>
    (props.product?.max_securities ?? 0) > 0 &&
    collaterals.value.length + guarantors.value.length >= (props.product?.max_securities ?? 0),
)
function toggleCollateral(): void {
  addingCollateral.value = !addingCollateral.value
  error.value = ''
}
function toggleGuarantor(): void {
  addingGuarantor.value = !addingGuarantor.value
  error.value = ''
}

function addCollateral(): void {
  error.value = ''
  if (!collateral.description.trim() || !(Number(collateral.estimated_value) > 0)) {
    error.value = 'Add a description and a value greater than zero.'
    return
  }
  if (countLimitReached.value) {
    error.value = 'The product’s maximum number of securities has been reached.'
    return
  }
  collaterals.value = [
    ...collaterals.value,
    {
      ...collateral,
      description: collateral.description.trim(),
      estimated_value: Number(collateral.estimated_value).toFixed(2),
    },
  ]
  Object.assign(collateral, { asset_type: 'Land', description: '', estimated_value: '', notes: '' })
  addingCollateral.value = false
}
function addGuarantor(): void {
  error.value = ''
  const member = selectedGuarantor.value
  if (!member || !(Number(guaranteeAmount.value) > 0)) {
    error.value = 'Select a guarantor and enter a guarantee amount greater than zero.'
    return
  }
  if (guarantors.value.some((item) => item.member_id === member.id)) {
    error.value = 'This member is already a guarantor.'
    return
  }
  if (countLimitReached.value) {
    error.value = 'The product’s maximum number of securities has been reached.'
    return
  }
  guarantors.value = [
    ...guarantors.value,
    { member_id: member.id, guaranteed_amount: Number(guaranteeAmount.value).toFixed(2) },
  ]
  guarantorNames.value = { ...guarantorNames.value, [member.id]: member.name }
  selectedGuarantor.value = null
  guaranteeAmount.value = ''
  addingGuarantor.value = false
}
</script>
<template>
  <section class="loan-card">
    <div class="loan-card-heading">
      <ShieldCheck :size="18" aria-hidden="true" />
      <h2>Collateral & guarantors</h2>
    </div>
    <p class="loan-hint">
      Add assets or savings-backed member guarantees. Guarantor consent is recorded after submission.
    </p>
    <div class="loan-security-totals">
      <div>
        <span>Required security</span><strong>{{ formatMoney(required) }}</strong>
      </div>
      <div>
        <span>Provided</span><strong>{{ formatMoney(provided) }}</strong>
      </div>
      <div>
        <span>Remaining gap</span><strong>{{ formatMoney(Math.max(0, required - provided)) }}</strong>
      </div>
    </div>
    <p v-if="product && product.max_securities > 0" class="loan-hint">
      Up to {{ product.max_securities }} securities for this product.
    </p>
    <ul class="loan-security-list">
      <li v-for="(item, index) in collaterals" :key="`collateral-${index}`">
        <ShieldCheck :size="18" aria-hidden="true" />
        <div>
          <strong>{{ item.asset_type }} · {{ formatMoney(item.estimated_value) }}</strong>
          <p>{{ item.description }}</p>
        </div>
        <button
          type="button"
          class="loan-icon-button"
          :disabled="disabled"
          :aria-label="`Remove collateral ${index + 1}`"
          @click="collaterals = collaterals.filter((_, i) => i !== index)"
        >
          <Trash2 :size="16" />
        </button>
      </li>
      <li v-for="(item, index) in guarantors" :key="`guarantor-${item.member_id}`">
        <UsersRound :size="18" aria-hidden="true" />
        <div>
          <strong>{{ guarantorNames[item.member_id] || `Member #${item.member_id}` }}</strong>
          <p>Guarantee · {{ formatMoney(item.guaranteed_amount) }}</p>
        </div>
        <button
          type="button"
          class="loan-icon-button"
          :disabled="disabled"
          :aria-label="`Remove guarantor ${index + 1}`"
          @click="guarantors = guarantors.filter((_, i) => i !== index)"
        >
          <Trash2 :size="16" />
        </button>
      </li>
    </ul>
    <p v-if="error" class="loan-field-error" role="alert">{{ error }}</p>
    <div v-if="addingCollateral" class="loan-subform">
      <div class="loan-fields">
        <label :for="`${uid}-type`"
          >Asset type<select :id="`${uid}-type`" v-model="collateral.asset_type">
            <option
              v-for="kind in ['Land', 'Building', 'Vehicle', 'Equipment', 'Savings/Deposit', 'Other']"
              :key="kind"
            >
              {{ kind }}
            </option>
          </select></label
        ><label :for="`${uid}-value`"
          >Estimated value<input
            :id="`${uid}-value`"
            v-model="collateral.estimated_value"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00" /></label
        ><label class="loan-span-all" :for="`${uid}-description`"
          >Description<input
            :id="`${uid}-description`"
            v-model="collateral.description"
            maxlength="500"
            placeholder="Describe the asset and identify ownership" /></label
        ><label class="loan-span-all" :for="`${uid}-notes`"
          >Notes (optional)<textarea :id="`${uid}-notes`" v-model="collateral.notes" maxlength="2000" rows="2" />
        </label>
      </div>
      <div class="loan-inline-actions">
        <button type="button" class="loan-button loan-button--quiet" @click="addingCollateral = false">
          Cancel asset</button
        ><button type="button" class="loan-button loan-button--primary" @click="addCollateral">Add asset</button>
      </div>
    </div>
    <div v-if="addingGuarantor" class="loan-subform">
      <label class="loan-field-label">Guarantor</label
      ><LoanMemberPicker v-model="selectedGuarantor" label="Guarantor" :exclude-id="borrowerId" /><label
        :for="`${uid}-guarantee`"
        class="loan-field-label"
        >Guarantee amount<input
          :id="`${uid}-guarantee`"
          v-model="guaranteeAmount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
      /></label>
      <p class="loan-hint">The guarantor must have enough unpledged savings when consent is accepted.</p>
      <div class="loan-inline-actions">
        <button type="button" class="loan-button loan-button--quiet" @click="addingGuarantor = false">
          Cancel guarantor</button
        ><button type="button" class="loan-button loan-button--primary" @click="addGuarantor">Add guarantor</button>
      </div>
    </div>
    <div class="loan-inline-actions">
      <button
        type="button"
        class="loan-button loan-button--outline"
        :disabled="disabled || countLimitReached"
        @click="toggleCollateral"
      >
        <Plus :size="16" />{{ addingCollateral ? 'Close collateral form' : 'Add collateral' }}</button
      ><button
        type="button"
        class="loan-button loan-button--outline"
        :disabled="disabled || countLimitReached"
        @click="toggleGuarantor"
      >
        <Plus :size="16" />{{ addingGuarantor ? 'Close guarantor form' : 'Add guarantor' }}
      </button>
    </div>
  </section>
</template>
