<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ChevronLeft, Edit, Eye, Landmark, Plus, Trash2 } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import { formatMoney } from '@/core/utils/format'
import { savingsProductsApi } from '../../api'
import SavingsProductChargesModal from '../../components/SavingsProductChargesModal.vue'
import SavingsProductDeleteDialog from '../../components/SavingsProductDeleteDialog.vue'
import SavingsAccountRules from '../../components/SavingsAccountRules.vue'
import SavingsProductFormDrawer from '../../components/SavingsProductFormDrawer.vue'
import type { SavingsProduct } from '../../types'

const products = ref<SavingsProduct[]>([])
const loading = ref(true)
const error = ref('')

const selectedProductForCharges = ref<SavingsProduct | null>(null)
const showChargesModal = ref(false)

const deleteTarget = ref<SavingsProduct | null>(null)
const deleting = ref(false)

const formOpen = ref(false)
const editingId = ref<number | null>(null)

function openForm(product: SavingsProduct | null = null) {
  editingId.value = product?.id ?? null
  formOpen.value = true
}

async function loadProducts() {
  loading.value = true
  try {
    products.value = (await savingsProductsApi.list({ per_page: 100 })).data
  } catch {
    error.value = 'Failed to load savings products'
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)

async function deleteProduct() {
  if (!deleteTarget.value) return
  deleting.value = true
  error.value = ''
  try {
    await savingsProductsApi.remove(deleteTarget.value.id)
    await loadProducts()
  } catch (e) {
    error.value = e instanceof ApiError && e.status === 409
      ? `${deleteTarget.value.name} has accounts opened under it, so it cannot be deleted.`
      : 'Failed to delete savings product'
  } finally {
    deleting.value = false
    deleteTarget.value = null
  }
}

function openChargesModal(product: SavingsProduct) {
  selectedProductForCharges.value = product
  showChargesModal.value = true
}
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink :to="{ name: 'savings.settings' }" aria-label="Back" class="mr-2 rounded-full p-2 transition hover:bg-neutral-200 dark:hover:bg-neutral-800">
        <ChevronLeft class="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
      </RouterLink>
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Landmark class="h-5 w-5 text-brand" />
      </div>
      <div class="flex-1">
        <h1 class="text-page-title text-heading">Savings Products List</h1>
        <p class="text-sm text-muted-foreground">Manage rules and configurations for savings products</p>
      </div>

      <button
        type="button"
        class="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
        @click="openForm()"
      >
        <Plus class="h-4 w-4" />
        <span>Create Product</span>
      </button>
    </div>

    <p v-if="error" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
      {{ error }}
    </p>

    <div class="overflow-hidden rounded-lg border border-border bg-background">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-muted-foreground">
          <thead class="bg-neutral-50 text-xs uppercase text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400">
            <tr>
              <th scope="col" class="px-6 py-4 text-left font-semibold">Name</th>
              <th scope="col" class="px-6 py-4 text-left font-semibold">Type</th>
              <th scope="col" class="px-6 py-4 text-left font-semibold">Min Balance</th>
              <th scope="col" class="px-6 py-4 text-center font-semibold">Status</th>
              <th scope="col" class="px-6 py-4 text-center font-semibold">Charges</th>
              <th scope="col" class="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="px-6 py-10 text-center">
                <div class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
                  Loading savings products...
                </div>
              </td>
            </tr>
            <tr v-else-if="products.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-muted-foreground">No savings products found. Click "Create Product" to add one.</td>
            </tr>
            <tr
              v-for="product in products"
              :key="product.id"
              class="border-b border-border transition-colors last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <td class="whitespace-nowrap px-6 py-4 font-medium text-foreground">{{ product.name }}</td>
              <td class="whitespace-nowrap px-6 py-4 capitalize">{{ product.type }}</td>
              <td class="whitespace-nowrap px-6 py-4">{{ formatMoney(product.minimum_balance) }}</td>
              <td class="whitespace-nowrap px-6 py-4 text-center">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    product.is_active
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400',
                  ]"
                >
                  {{ product.is_active ? 'active' : 'inactive' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                  @click="openChargesModal(product)"
                >
                  <Eye class="h-3.5 w-3.5" />
                  <span>View ({{ (product.charges?.length || 0) + (product.monthly_fee_enabled ? 1 : 0) }})</span>
                </button>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    :aria-label="`Edit ${product.name}`"
                    class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-brand dark:hover:bg-neutral-800"
                    @click="openForm(product)"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    :aria-label="`Delete ${product.name}`"
                    class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    @click="deleteTarget = product"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <SavingsProductChargesModal :is-open="showChargesModal" :product="selectedProductForCharges" @close="showChargesModal = false" />
    <SavingsAccountRules />

    <SavingsProductFormDrawer v-model:open="formOpen" :product-id="editingId" @saved="loadProducts" />
    <SavingsProductDeleteDialog :show="deleteTarget !== null" :product-name="deleteTarget?.name" :deleting="deleting" @confirm="deleteProduct" @cancel="deleteTarget = null" />
  </div>
</template>
