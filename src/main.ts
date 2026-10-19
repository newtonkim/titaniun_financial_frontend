import './assets/main.css'
import './assets/tailwind.css'

import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from './core/composables/useTheme'
import router from './router'

initTheme()

createApp(App).use(router).mount('#app')
