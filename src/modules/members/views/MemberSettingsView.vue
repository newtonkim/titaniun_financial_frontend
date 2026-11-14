<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { useAuth } from '@/modules/auth/store'
import { savingsProductsApi } from '@/modules/savings/api'
import { memberSettingsApi } from '../api'

const { can } = useAuth()
const saved = ref(false)
const loadError = ref('')
const canManage = computed(() => can('access.manage'))
const savingsProducts = ref<{ id: number; name: string }[]>([])

const form = useForm({ code_prefix: 'FA', code_length: 8, savings_product_id: null as number | null, member_savings_product_id: null as number | null }, async (data) => {
  await memberSettingsApi.update({ code_prefix: data.code_prefix.trim().toUpperCase(), code_length: data.code_length, savings_product_id: data.savings_product_id, member_savings_product_id: data.member_savings_product_id })
  saved.value = true
})

const example = computed(() => `${form.data.code_prefix.trim().toUpperCase() || 'FA'}-${'X'.repeat(Math.max(1, Number(form.data.code_length) || 1))}`)

onMounted(async () => {
  try {
    const [settings, products] = await Promise.all([memberSettingsApi.show(), savingsProductsApi.list({ active: true, per_page: 100 })])
    savingsProducts.value = products.data.map((product) => ({ id: product.id, name: product.name }))
    form.data.code_prefix = settings.code_prefix
    form.data.code_length = settings.code_length
    form.data.savings_product_id = settings.savings_product_id
    form.data.member_savings_product_id = settings.member_savings_product_id
  } catch {
    loadError.value = 'The settings could not be loaded.'
  }
})
</script>

<template>
  <div class="tw-scope flex max-w-xl flex-col gap-6">
    <PageHeader title="Free agent settings" description="How free agent codes are formed and which savings product free agents save under." />
    <form class="flex flex-col gap-5 rounded-lg border border-border bg-background p-5" @submit.prevent="form.submit">
      <p v-if="loadError || form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ loadError || form.message.value }}</p>
      <p v-if="saved" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Saved.</p>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Code prefix
        <Input v-model="form.data.code_prefix" maxlength="10" pattern="[A-Za-z0-9]+" required class="uppercase" :disabled="!canManage" />
        <span class="text-xs font-normal text-muted-foreground">Filled in for staff as {{ form.data.code_prefix.trim().toUpperCase() || 'FA' }}- on the new free agent form. Codes already issued are not changed.</span>
        <span v-if="form.error('code_prefix')" class="text-xs font-normal text-destructive">{{ form.error('code_prefix') }}</span>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Characters after the prefix
        <Input v-model.number="form.data.code_length" type="number" min="1" max="20" required :disabled="!canManage" />
        <span class="text-xs font-normal text-muted-foreground">Staff type exactly this many letters or digits, e.g. <span class="font-mono">{{ example }}</span>.</span>
        <span v-if="form.error('code_length')" class="text-xs font-normal text-destructive">{{ form.error('code_length') }}</span>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Free agent savings product
        <select v-model="form.data.savings_product_id" :disabled="!canManage" class="h-9 rounded-md border border-border bg-background px-3 text-sm font-normal">
          <option :value="null">— keep their current product —</option>
          <option v-for="product in savingsProducts" :key="product.id" :value="product.id">{{ product.name }}</option>
        </select>
        <span class="text-xs font-normal text-muted-foreground">Free agents' open savings accounts are kept on this product: saving here moves existing free agents onto it, and anyone who becomes a free agent moves too. A balance moves between the products' liability accounts with a journal entry.</span>
        <span v-if="form.error('savings_product_id')" class="text-xs font-normal text-destructive">{{ form.error('savings_product_id') }}</span>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Member savings product
        <select v-model="form.data.member_savings_product_id" :disabled="!canManage" class="h-9 rounded-md border border-border bg-background px-3 text-sm font-normal">
          <option :value="null">— keep their current product —</option>
          <option v-for="product in savingsProducts" :key="product.id" :value="product.id" :disabled="product.id === form.data.savings_product_id">{{ product.name }}</option>
        </select>
        <span class="text-xs font-normal text-muted-foreground">When a free agent becomes a member, their savings accounts on the free agent product move to this product, with any balance moved by a journal entry. Saving here also moves members still on the free agent product.</span>
        <span v-if="form.error('member_savings_product_id')" class="text-xs font-normal text-destructive">{{ form.error('member_savings_product_id') }}</span>
      </label>
      <div v-if="canManage" class="flex justify-end"><Button type="submit" :disabled="form.processing.value">{{ form.processing.value ? 'Saving…' : 'Save' }}</Button></div>
    </form>
  </div>
</template>
