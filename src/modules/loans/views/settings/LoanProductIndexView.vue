<script setup lang="ts">
import { ArrowLeft, CreditCard, Eye, Pencil, Plus, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import LoanProductDeleteDialog from '../../components/LoanProductDeleteDialog.vue'
import LoanProductFormDrawer from '../../components/LoanProductFormDrawer.vue'
import { interestPeriodLabel, useLoanProducts } from '../../composables/useLoanProducts'

const router = useRouter()

const {
  products, loading, error, search, meta, pages,
  fetch,
  formOpen, editingId, openCreate, openEdit,
  showDeleteDialog, deleteTarget, deleting,
  openDeleteDialog, confirmDelete,
  interestMethodLabel,
} = useLoanProducts()
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          class="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          @click="router.push({ name: 'loans.settings' })"
        >
          <ArrowLeft class="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
        </button>
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
          <CreditCard class="h-5 w-5 text-brand" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Loan Products</h1>
          <p class="text-sm text-muted-foreground">Manage loan types and their configurations</p>
        </div>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        New Product
      </button>
    </div>

    <!-- Search -->
    <div class="relative max-w-sm">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="search"
        type="text"
        placeholder="Search loan products…"
        aria-label="Search loan products"
        class="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm dark:text-white"
      />
    </div>

    <p v-if="error" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
      {{ error }}
    </p>

    <!-- Table -->
    <div class="overflow-hidden rounded-lg border border-border bg-background">
      <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
      <div v-else-if="products.length === 0" class="flex flex-col items-center justify-center gap-2 py-16">
        <CreditCard class="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
        <p class="text-sm text-muted-foreground">No loan products found.</p>
        <button type="button" class="mt-2 text-sm font-medium text-brand hover:underline" @click="openCreate">
          Create your first loan product
        </button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-border">
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th class="px-6 py-3 text-left">Name</th>
              <th class="px-6 py-3 text-left">Interest Method</th>
              <th class="px-6 py-3 text-left">Interest Rate</th>
              <th class="px-6 py-3 text-left">Interest split</th>
              <th class="px-6 py-3 text-left">Duration</th>
              <th class="px-6 py-3 text-left">Status</th>
              <th class="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-50 dark:divide-neutral-800">
            <tr v-for="product in products" :key="product.id" class="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td class="px-6 py-4 font-medium text-foreground">
                {{ product.name }}
                <span class="ml-1 font-mono text-xs font-normal text-muted-foreground">{{ product.code }}</span>
              </td>
              <td class="px-6 py-4 text-neutral-600 dark:text-neutral-400">{{ interestMethodLabel(product.interest_method) }}</td>
              <td class="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                {{ product.interest_rate != null ? `${product.interest_rate}% ${interestPeriodLabel(product.interest_period)}` : '—' }}
              </td>
              <td class="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                {{ 100 - Number(product.commission_rate) }}% company / {{ product.commission_rate }}% commission
              </td>
              <td class="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                {{ product.max_term != null ? `${product.max_term} ${product.duration_type ?? ''}` : '—' }}
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="product.is_active
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-neutral-100 text-muted-foreground dark:bg-neutral-800'"
                >
                  <component :is="product.is_active ? ToggleRight : ToggleLeft" class="h-3 w-3" />
                  {{ product.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    title="View"
                    :aria-label="`View ${product.name}`"
                    @click="router.push({ name: 'loans.products.show', params: { id: product.id } })"
                  >
                    <Eye class="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    title="Edit"
                    :aria-label="`Edit ${product.name}`"
                    @click="openEdit(product)"
                  >
                    <Pencil class="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                    :aria-label="`Delete ${product.name}`"
                    @click="openDeleteDialog(product)"
                  >
                    <Trash2 class="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="meta.last_page > 1" class="flex items-center justify-center gap-1">
      <button
        v-for="page in pages"
        :key="page"
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors"
        :class="page === meta.current_page
          ? 'bg-brand text-white'
          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'"
        @click="fetch(page)"
      >
        {{ page }}
      </button>
    </div>

    <LoanProductFormDrawer v-model:open="formOpen" :product-id="editingId" @saved="fetch(meta.current_page)" />
    <LoanProductDeleteDialog
      :show="showDeleteDialog"
      :product-name="deleteTarget?.name"
      :deleting="deleting"
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>
