import './assets/main.css'
import './assets/tailwind.css'

import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from './core/composables/useTheme'
import router from './router'

initTheme()
// Scrolling over a focused number field would otherwise change the amount; scroll the page instead.
document.addEventListener(
  'wheel',
  (event) => {
    const target = event.target
    if (target instanceof HTMLInputElement && target.type === 'number' && target === document.activeElement) target.blur()
  },
  { passive: true },
)

createApp(App).use(router).mount('#app')
