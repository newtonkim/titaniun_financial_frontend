<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { shareRegisterApi } from '../api'
import AllotSharesDrawer from '../components/AllotSharesDrawer.vue'
import type { ShareRegister } from '../types'

const { can } = useAuth()
const register = ref<ShareRegister | null>(null)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const allotting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    register.value = await shareRegisterApi.show()
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not load the share register.'
  } finally {
    loading.value = false
  }
}

function allotted(count: number) {
  notice.value = `Shares allotted to ${count} ${count === 1 ? 'member' : 'members'} and posted to share capital.`
  void load()
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <header class="panel__header">
      <h1>Share register</h1>
      <div class="panel__actions">
        <button v-if="can('shares.manage')" type="button" class="btn btn--primary" @click="allotting = true">Allot shares</button>
      </div>
    </header>

    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
    <p v-if="notice" class="muted" role="status">{{ notice }}</p>

    <dl v-if="register" class="register-summary">
      <div><dt>Paid-up share capital</dt><dd>{{ formatMoney(register.meta.paid_up_capital) }}</dd></div>
      <div><dt>Shareholders</dt><dd>{{ register.meta.shareholders }}</dd></div>
      <div>
        <dt>Most one member may hold ({{ register.meta.maximum_holding_fraction }})</dt>
        <dd>{{ formatMoney(register.meta.maximum_holding) }}</dd>
      </div>
      <div><dt>Minimum savings</dt><dd>{{ formatMoney(register.meta.minimum_savings) }}</dd></div>
    </dl>
    <p v-if="register && !register.meta.ownership_limit_applies" class="muted">
      The ownership limit applies once three members hold shares. Use an allotment to load the founders together.
    </p>

    <div class="table-wrap" :aria-busy="loading">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th class="num">Shares</th>
            <th class="num">Share capital</th>
            <th class="num">Of total</th>
            <th class="num">Savings</th>
            <th>Standing</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in register?.data ?? []" :key="row.member_id">
            <td>
              <RouterLink :to="{ name: 'members.show', params: { id: row.member_id } }">{{ row.name }}</RouterLink>
              <span class="muted"> · {{ row.member_number }}</span>
            </td>
            <td class="num">{{ row.shares_held }}</td>
            <td class="num">{{ formatMoney(row.share_capital) }}</td>
            <td class="num">{{ row.percentage }}%</td>
            <td class="num">{{ formatMoney(row.savings_balance) }}</td>
            <td class="standing">
              <span class="badge" :class="row.in_good_standing ? 'badge--active' : 'badge--pending'">
                {{ row.in_good_standing ? 'Good standing' : 'Action needed' }}
              </span>
              <span v-if="row.reasons.length" class="muted standing__reason">{{ row.reasons.join(' ') }}</span>
            </td>
          </tr>
          <tr v-if="!loading && register && register.data.length === 0">
            <td colspan="6" class="empty">No member holds shares yet. Allot the founders' shares to start the register.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <AllotSharesDrawer v-model:open="allotting" @allotted="allotted" />
  </section>
</template>

<style scoped>
.register-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1px; margin: 0 0 1rem; background: var(--border); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.register-summary div { background: var(--surface); padding: 0.75rem 1rem; }
.register-summary dt { font-size: 0.8rem; color: var(--muted); }
.register-summary dd { margin: 0.2rem 0 0; font-size: 1.1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.standing { white-space: normal; }
.standing__reason { display: block; font-size: 0.8rem; margin-top: 0.2rem; max-width: 22rem; }
</style>
