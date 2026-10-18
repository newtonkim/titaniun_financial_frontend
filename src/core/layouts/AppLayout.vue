<script setup lang="ts">
import { useRouter } from 'vue-router'
import BrandLogo from '@/core/components/BrandLogo.vue'
import { modules } from '@/modules'
import { useAuth } from '@/modules/auth/store'

const auth = useAuth()
const router = useRouter()

async function signOut(): Promise<void> {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <RouterLink class="brand" :to="{ name: 'dashboard' }"><BrandLogo :size="34" /> Titaniun Financial</RouterLink>
      <nav>
        <section v-for="module in modules" :key="module.name" class="nav-group">
          <h2>{{ module.label }}</h2>
          <RouterLink v-for="item in module.nav" :key="item.label" :to="item.to">{{ item.label }}</RouterLink>
        </section>
      </nav>
    </aside>

    <div class="main">
      <header class="topbar">
        <span class="muted">{{ auth.user.value?.name }}</span>
        <button class="btn btn--small" @click="signOut">Sign out</button>
      </header>
      <main class="content"><RouterView /></main>
    </div>
  </div>
</template>
