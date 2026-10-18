<script setup lang="ts">
import { ref } from 'vue'

const model = defineModel<string>({ required: true })

defineProps<{ autocomplete: string; id?: string }>()

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
      required
      @keydown="detectCapsLock"
      @keyup="detectCapsLock"
      @blur="capsLock = false"
    />
    <button type="button" class="password__toggle" :aria-pressed="visible" @click="visible = !visible">
      {{ visible ? 'Hide' : 'Show' }}
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
  padding-right: 4.25rem;
}

.password__toggle {
  position: absolute;
  inset-block: 0.3rem;
  right: 0.3rem;
  padding: 0 0.7rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 160ms var(--ease-out), color 160ms var(--ease-out);
}

.password__toggle:hover {
  background: var(--bg);
  color: var(--text);
}

.password__hint {
  font-size: 0.8125rem;
  color: var(--warning);
}
</style>
