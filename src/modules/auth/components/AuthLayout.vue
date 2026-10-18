<script setup lang="ts">
import BrandMark from '@/core/components/BrandMark.vue'
</script>

<template>
  <div class="auth">
    <aside class="auth__brand">
      <div class="auth__identity">
        <BrandMark :size="52" />
        <span class="auth__name">Titanium Financial</span>
      </div>

      <div class="auth__pitch">
        <p class="auth__statement">The books your members trust, kept balanced every day.</p>
        <ul class="auth__scope">
          <li>Member registry and KYC records</li>
          <li>Savings, shares and loan portfolios</li>
          <li>Double-entry ledger with a daily trial balance</li>
        </ul>
      </div>

      <p class="auth__notice">Access is restricted to authorised staff.</p>
    </aside>

    <main class="auth__main">
      <div class="auth__form">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth {
  --panel: oklch(0.26 0.014 255);
  --panel-ink: oklch(0.94 0.006 255);
  --panel-muted: oklch(0.76 0.012 255);
  --panel-rule: oklch(0.38 0.014 255);

  display: grid;
  grid-template-columns: minmax(360px, 5fr) 7fr;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--surface);
}

.auth__brand {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 3rem;
  padding: 2.5rem clamp(2rem, 4vw, 3.5rem);
  color: var(--panel-ink);
  background:
    radial-gradient(110% 55% at 15% 0%, oklch(1 0 0 / 0.07), transparent 65%),
    repeating-linear-gradient(0deg, oklch(1 0 0 / 0.022) 0 1px, transparent 1px 3px),
    var(--panel);
  overflow: hidden;
}

.auth__identity {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.auth__name {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.005em;
}

.auth__pitch {
  max-width: 28rem;
}

.auth__statement {
  margin: 0 0 2rem;
  font-size: 2rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.auth__scope {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--panel-rule);
}

.auth__scope li {
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--panel-rule);
  color: var(--panel-muted);
}

.auth__notice {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--panel-muted);
}

.auth__main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
}

.auth__form {
  width: 100%;
  max-width: 24rem;
}

@media (max-width: 860px) {
  .auth {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
  }

  .auth__brand {
    padding: 1.25rem 1.5rem;
  }

  .auth__pitch,
  .auth__notice {
    display: none;
  }

  .auth__main {
    align-items: flex-start;
    padding: 2.5rem 1.25rem;
  }
}
</style>
