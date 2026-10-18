<script setup lang="ts">
import { ref } from 'vue'

const model = defineModel<string>({ required: true })

defineProps<{ autocomplete: string; id?: string; placeholder?: string }>()

const visible = ref(false)
const capsLock = ref(false)

function detectCapsLock(event: KeyboardEvent): void {
  capsLock.value = event.getModifierState?.('CapsLock') ?? false
}
</script>

<template>
  <span class="password">
    <input
      :id="id"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      required
      @keydown="detectCapsLock"
      @keyup="detectCapsLock"
      @blur="capsLock = false"
    />
    <button
      type="button"
      class="password__toggle"
      :aria-label="visible ? 'Hide password' : 'Show password'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        <path v-if="visible" d="m3 3 18 18" />
      </svg>
    </button>
  </span>
  <span v-if="capsLock" class="password__hint" role="status">Caps Lock is on.</span>
</template>

<style scoped>
.password {
  position: relative;
  display: block;
}

.password input {
  width: 100%;
  padding-right: 3.5rem !important;
}

.password__toggle {
  position: absolute;
  top: 50%;
  right: 0.6rem;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4a4f5c;
  cursor: pointer;
  transform: translateY(-50%);
  transition: background-color 160ms var(--ease-out);
}

.password__toggle:hover {
  background: #f1f2f5;
}

.password__toggle svg {
  width: 1.4rem;
  height: 1.4rem;
}

.password__hint {
  font-size: 0.9rem;
  color: #8a5a00;
}
</style>
