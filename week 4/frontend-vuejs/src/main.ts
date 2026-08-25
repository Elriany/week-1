import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useLocaleStore } from './stores/locale.store'
import { useAuthStore } from './stores/auth.store'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(i18n)

  // Locale first: applying dir/lang before the first paint avoids an LTR flash.
  useLocaleStore().initialize()

  // Restore the session BEFORE the router is installed. The first navigation
  // guard runs on install, and it must already know whether we are signed in —
  // otherwise a reload on a protected route redirects to login despite a valid token.
  await useAuthStore().restore()

  app.use(router)
  app.mount('#app')
}

bootstrap()
