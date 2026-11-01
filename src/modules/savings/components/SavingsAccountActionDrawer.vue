<script setup lang="ts">
import { computed, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { useForm } from '@/core/composables/useForm'
import { formatEnum } from '@/core/utils/format'
import { savingsAccountsApi } from '../api'
import { SAVINGS_FREEZE_REASONS, type SavingsAccount, type SavingsFreezeReason } from '../types'

export type SavingsAccountAction = 'dormant' | 'freeze' | 'close' | 'reactivate' | 'release_freeze'

/** Take one lifecycle action on a savings account, with the reason that goes into its history. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ action: SavingsAccountAction; account: SavingsAccount }>()
const emit = defineEmits<{ saved: [message: string] }>()

const COPY: Record<SavingsAccountAction, { title: string; note: string; save: string; done: string }> = {
  dormant: { title: 'Mark as dormant', note: 'The member can still deposit, but cannot withdraw. Bringing the account back needs two officers.', save: 'Mark dormant', done: 'Account marked dormant.' },
  freeze: { title: 'Freeze account', note: 'Withdrawals stop straight away. Deposits still post. Releasing the freeze needs a second person.', save: 'Freeze account', done: 'Account frozen.' },
  close: { title: 'Request closure', note: 'Closing is final and needs a second person. The account must be empty, with no guarantee, arrears or reversal waiting.', save: 'Send for approval', done: 'Closure sent for approval.' },
  reactivate: { title: 'Request reactivation', note: 'A second officer must approve before the member can withdraw.', save: 'Send for approval', done: 'Reactivation sent for approval.' },
  release_freeze: { title: 'Request freeze release', note: 'A second person must approve before withdrawals resume.', save: 'Send for approval', done: 'Freeze release sent for approval.' },
}

const copy = computed(() => COPY[props.action])
const form = useForm({ reason_code: 'court_order' as SavingsFreezeReason, reason: '' }, (data): Promise<unknown> => {
  if (props.action === 'dormant') return savingsAccountsApi.markDormant(props.account.id, data.reason)
  if (props.action === 'freeze') return savingsAccountsApi.freeze(props.account.id, data.reason_code, data.reason)
  return savingsAccountsApi.requestChange(props.account.id, props.action, data.reason)
})

watch(open, (isOpen) => {
  if (isOpen) {
    form.data.reason = ''
    form.errors.value = {}
    form.message.value = null
  }
})

async function save() {
  if (await form.submit()) {
    emit('saved', copy.value.done)
    open.value = false
  }
}
</script>

<template>
  <AppDrawer v-model:open="open" :title="copy.title" :description="account.account_number" :save-button-text="copy.save" :loading="form.processing.value" @save="save">
    <div class="flex flex-col gap-4">
      <p v-if="form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ form.message.value }}</p>
      <p class="text-sm text-muted-foreground">{{ copy.note }}</p>
      <label v-if="action === 'freeze'" class="flex flex-col gap-1 text-sm font-medium">
        Reason type
        <select v-model="form.data.reason_code" class="rounded-md">
          <option v-for="code in SAVINGS_FREEZE_REASONS" :key="code" :value="code">{{ formatEnum(code) }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Reason
        <textarea v-model="form.data.reason" required minlength="3" maxlength="1000" rows="4" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" />
        <span v-if="form.error('reason')" class="text-xs font-normal text-destructive">{{ form.error('reason') }}</span>
      </label>
    </div>
  </AppDrawer>
</template>
