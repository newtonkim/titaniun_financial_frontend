import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'titaniun.theme'
const systemQuery = window.matchMedia('(prefers-color-scheme: dark)')

/** The theme the viewer picked, or null to follow the system setting. */
const chosenTheme = ref<Theme | null>(readStoredTheme())
const systemPrefersDark = ref(systemQuery.matches)

systemQuery.addEventListener('change', (event) => {
  systemPrefersDark.value = event.matches
})

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function applyTheme(): void {
  if (chosenTheme.value) {
    document.documentElement.dataset.theme = chosenTheme.value
  } else {
    delete document.documentElement.dataset.theme
  }
}

/** Apply the stored theme before the app mounts, so the first paint is already in the right palette. */
export function initTheme(): void {
  applyTheme()
}

export function useTheme() {
  const isDark = computed(() => (chosenTheme.value ? chosenTheme.value === 'dark' : systemPrefersDark.value))

  function toggleTheme(): void {
    chosenTheme.value = isDark.value ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, chosenTheme.value)
    } catch {
      // Storage can be unavailable (private windows); the choice still holds for this visit.
    }
    applyTheme()
  }

  return { isDark, toggleTheme }
}
