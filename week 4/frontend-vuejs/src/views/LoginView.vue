<template>
  <div class="login-page">
    <div class="login-card">
      <header class="brand">
        <h1>{{ t('app.title') }}</h1>
        <p>{{ t('auth.subtitle') }}</p>
      </header>

      <form novalidate @submit.prevent="handleSubmit">
        <BaseInput
          v-model="email"
          type="email"
          dir="ltr"
          autocomplete="username"
          :label="t('auth.email')"
          :error="fieldErrors.email"
          required
        />

        <BaseInput
          v-model="password"
          type="password"
          dir="ltr"
          autocomplete="current-password"
          :label="t('auth.password')"
          :error="fieldErrors.password"
          required
        />

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

        <BaseButton variant="primary" size="lg" type="submit" :loading="loading">
          {{ t('auth.signIn') }}
        </BaseButton>
      </form>

      <!-- Development-only shortcut for trying each role. See `isDev` below. -->
      <section v-if="isDev" class="demo">
        <h2>{{ t('auth.demo.title') }}</h2>
        <p class="demo-hint">{{ t('auth.demo.hint', { password: DEMO_PASSWORD }) }}</p>

        <ul class="demo-list">
          <li v-for="account in demoAccounts" :key="account.email">
            <button
              type="button"
              class="demo-account"
              :disabled="loading"
              @click="signInAs(account.email)"
            >
              <span class="demo-role">{{ t(account.labelKey) }}</span>
              <bdi class="demo-email">{{ account.email }}</bdi>
              <span class="demo-scope">{{ t(account.scopeKey) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <footer class="switcher">
        <LanguageSwitcher />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { ApiError } from '@/types/api'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const formError = ref('')
const fieldErrors = reactive({ email: '', password: '' })

const isDev = import.meta.env.DEV

/**
 * Matches the password the database seed assigns to every demo account.
 *
 * Both constants sit behind `import.meta.env.DEV`, which Vite replaces with a
 * literal `false` at build time. Rollup then folds the dead branch away, so the
 * account list and this password are absent from a production bundle — a `v-if`
 * on its own would hide the markup but still ship the strings.
 */
const DEMO_PASSWORD = isDev ? 'Passw0rd!' : ''

const demoAccounts = isDev
  ? [
      { email: 'admin@azm.local', labelKey: 'auth.demo.roles.admin', scopeKey: 'auth.demo.scope.allBranches' },
      { email: 'manager@azm.local', labelKey: 'auth.demo.roles.manager', scopeKey: 'auth.demo.scope.hq' },
      { email: 'supervisor@azm.local', labelKey: 'auth.demo.roles.supervisor', scopeKey: 'auth.demo.scope.hq' },
      { email: 'agent@azm.local', labelKey: 'auth.demo.roles.agent', scopeKey: 'auth.demo.scope.hq' },
      { email: 'customer@azm.local', labelKey: 'auth.demo.roles.customer', scopeKey: 'auth.demo.scope.hq' },
      { email: 'riyadh.agent@azm.local', labelKey: 'auth.demo.roles.agent', scopeKey: 'auth.demo.scope.riyadh' },
    ]
  : []

function resetErrors() {
  formError.value = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
}

function validate(): boolean {
  resetErrors()
  if (!email.value.trim()) fieldErrors.email = t('auth.errors.emailRequired')
  if (!password.value) fieldErrors.password = t('auth.errors.passwordRequired')
  return !fieldErrors.email && !fieldErrors.password
}

/** Fills the form from a demo account and signs in immediately. */
async function signInAs(demoEmail: string) {
  email.value = demoEmail
  password.value = DEMO_PASSWORD
  await handleSubmit()
}

async function handleSubmit() {
  if (!validate()) return

  loading.value = true
  try {
    await auth.login(email.value.trim(), password.value)

    // Return the user to wherever the guard intercepted them, if anywhere.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.replace(redirect ?? { name: 'dashboard' })
  } catch (err) {
    // Prefer a translated message keyed on the error code; fall back to the
    // server's English text, which Story 04 recorded as not yet localized.
    if (err instanceof ApiError) {
      formError.value =
        err.status === 401
          ? t('auth.errors.invalidCredentials')
          : err.status === 429
            ? t('auth.errors.tooManyAttempts')
            : (err.serverMessage ?? t('errors.unreachable'))
    } else {
      formError.value = t('errors.unreachable')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-4);
  background-color: var(--color-gray-100);
}

.login-card {
  width: 100%;
  max-width: 26rem;
  background-color: white;
  padding: var(--spacing-8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.brand {
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.brand h1 {
  margin: 0 0 var(--spacing-2) 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-900);
}

.brand p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-error {
  margin: 0;
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  background-color: var(--color-danger-light);
  color: #991b1b;
  font-size: var(--font-size-sm);
  text-align: center;
}

.demo {
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-gray-200);
}

.demo h2 {
  margin: 0 0 var(--spacing-1) 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.demo-hint {
  margin: 0 0 var(--spacing-3) 0;
  font-size: var(--font-size-xs);
  color: var(--color-gray-600);
}

.demo-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.demo-account {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  text-align: start;
  background-color: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-family: inherit;
  transition: all var(--transition-base);
}

.demo-account:hover:not(:disabled) {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.demo-account:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.demo-role {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.demo-email {
  flex: 1;
  font-family: monospace;
  font-size: var(--font-size-xs);
  color: var(--color-gray-600);
}

.demo-scope {
  font-size: var(--font-size-xs);
  color: var(--color-gray-600);
  white-space: nowrap;
}

.switcher {
  margin-top: var(--spacing-6);
  display: flex;
  justify-content: center;
}
</style>
