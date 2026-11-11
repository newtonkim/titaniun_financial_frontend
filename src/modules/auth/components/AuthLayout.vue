<script setup lang="ts">
import BrandLogo from '@/core/components/BrandLogo.vue'

const services = [
  { name: 'Accounting', icon: 'calculator' },
  { name: 'Audit', icon: 'search' },
  { name: 'Book keeping', icon: 'lines' },
  { name: 'Taxation', icon: 'percent' },
  { name: 'Company registration', icon: 'building' },
] as const
</script>

<template>
  <div class="auth">
    <aside class="auth__brand">
      <span class="auth__flag" aria-hidden="true" />

      <div class="auth__identity">
        <BrandLogo :size="72" />
        <span class="auth__lockup">
          <span class="auth__name">Titanium Financial</span>
          <span class="auth__company">Consultancy Co. Ltd</span>
        </span>
      </div>

      <div class="auth__pitch">
        <h2 class="auth__statement">
          Your journey to <span class="auth__highlight">financial freedom</span> starts here.
        </h2>
        <p class="auth__lede">Track your books, audits and tax filings with the Titanium team, all in one place.</p>
      </div>

      <section class="auth__services" aria-labelledby="auth-services">
        <h3 id="auth-services" class="auth__services-title">Our services</h3>
        <ul>
          <li v-for="service in services" :key="service.name" class="auth__service">
            <span class="auth__service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <template v-if="service.icon === 'calculator'">
                  <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
                </template>
                <template v-else-if="service.icon === 'search'"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.35-4.35" /></template>
                <template v-else-if="service.icon === 'lines'"><path d="M6 8h12M6 12h12M6 16h12" /></template>
                <template v-else-if="service.icon === 'percent'"><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /></template>
                <template v-else><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></template>
              </svg>
            </span>
            {{ service.name }}
          </li>
        </ul>
      </section>

      <svg class="auth__horizon" viewBox="0 0 500 110" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 52 C 120 8, 330 -6, 500 40 V110 H0 Z" fill="#1d1d22" />
        <path d="M0 52 C 120 8, 330 -6, 500 40" fill="none" stroke="#b83236" stroke-width="4" />
      </svg>
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
  --crimson: #b83236;
  --crimson-dark: #9e272b;
  --crimson-bright: #e0484d;
  --navy: #1f2a5c;
  --ink: #1a1d29;
  --body: #3d4150;
  --subtle: #5f6372;
  --line: #d3d6de;
  --panel: #141417;
  --serif: 'DM Serif Display', Georgia, 'Times New Roman', serif;
  --sans: var(--font-sans);

  display: grid;
  grid-template-columns: clamp(400px, 32.5vw, 520px) minmax(0, 1fr);
  min-height: 100vh;
  min-height: 100dvh;
  background: #fff;
  color: var(--ink);
  color-scheme: light;
  font-family: var(--sans);
  font-size: 1rem;
}

/* Brand panel */
.auth__brand {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 4.5rem 4rem 7.5rem;
  color: #fff;
  background: radial-gradient(circle, rgb(255 255 255 / 0.11) 1px, transparent 1.6px) 0 0 / 20px 20px, var(--panel);
  overflow: hidden;
}

.auth__flag {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 13.5rem;
  background: var(--crimson);
}

.auth__identity {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.auth__identity :deep(svg) {
  flex: none;
  filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.35));
}

.auth__lockup {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.auth__name {
  font-family: var(--serif);
  font-size: 1.875rem;
  line-height: 1;
}

.auth__company {
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e7e7ec;
}

.auth__pitch {
  margin-top: auto;
  padding-top: 4rem;
}

.auth__statement {
  max-width: 22rem;
  margin: 0 0 1.75rem;
  font-family: var(--serif);
  font-size: 3.4rem;
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.01em;
  color: #fff;
  text-transform: none;
}

.auth__highlight {
  color: var(--crimson-bright);
}

.auth__lede {
  max-width: 23rem;
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.7;
  color: #cfd0d6;
}

.auth__services {
  margin-top: auto;
  padding-top: 4rem;
}

.auth__services-title {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #d9dae0;
}

.auth__services ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.auth__service {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 1.1rem 0.55rem 0.55rem;
  border-radius: 999px;
  background: #222227;
  font-size: 1.05rem;
  font-weight: 500;
}

.auth__service-icon {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--crimson);
}

.auth__service-icon svg {
  width: 0.95rem;
  height: 0.95rem;
}

.auth__horizon {
  position: absolute;
  inset: auto 0 0;
  width: 100%;
  height: 6.5rem;
}

/* Form side */
.auth__main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
}

.auth__form {
  width: 100%;
  max-width: 31.5rem;
}

@media (max-width: 960px) {
  .auth {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
  }

  .auth__brand {
    padding: 1.5rem;
  }

  .auth__flag {
    width: 6px;
    height: 100%;
  }

  .auth__pitch,
  .auth__services,
  .auth__horizon {
    display: none;
  }

  .auth__identity :deep(svg) {
    width: 52px;
    height: 52px;
  }

  .auth__name {
    font-size: 1.5rem;
  }

  .auth__company {
    font-size: 0.8rem;
  }

  .auth__main {
    align-items: flex-start;
    padding: 2.5rem 1.25rem;
  }
}
</style>
