<script setup lang="ts">
import { modules } from '@/modules'
import { useAuth } from '@/modules/auth/store'

const auth = useAuth()
</script>

<template>
  <section class="panel">
    <header class="panel__header"><h1>Welcome{{ auth.user.value ? `, ${auth.user.value.name}` : '' }}</h1></header>
    <div class="cards">
      <article v-for="module in modules" :key="module.name" class="card">
        <h2>{{ module.label }}</h2>
        <RouterLink v-for="item in module.nav" :key="item.label" :to="item.to">{{ item.label }}</RouterLink>
      </article>
    </div>
  </section>
</template>
