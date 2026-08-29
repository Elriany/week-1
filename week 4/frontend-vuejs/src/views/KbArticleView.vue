<template>
  <div class="kb-article-view">
    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="notFound" class="error-state">
      <strong>{{ t('kb.article.notFound') }}</strong><br />
      {{ t('kb.article.notFoundHint') }}<br />
      <RouterLink :to="{ name: 'kb' }">{{ t('kb.article.back') }}</RouterLink>
    </p>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <BaseCard v-else-if="article">
      <template #header>
        <div class="card-header">
          <RouterLink :to="{ name: 'kb' }">{{ t('kb.article.back') }}</RouterLink>
          <div v-if="auth.can('kb.manage')" class="actions">
            <BaseButton variant="secondary" size="sm" type="button" @click="showEdit = true">
              {{ t('kb.article.edit') }}
            </BaseButton>
            <BaseButton
              v-if="article.isPublished"
              variant="secondary"
              size="sm"
              type="button"
              :loading="publishing"
              @click="togglePublish(false)"
            >
              {{ t('kb.article.unpublish') }}
            </BaseButton>
            <BaseButton
              v-else
              variant="primary"
              size="sm"
              type="button"
              :loading="publishing"
              @click="togglePublish(true)"
            >
              {{ t('kb.article.publish') }}
            </BaseButton>
            <BaseButton variant="danger" size="sm" type="button" @click="showDelete = true">
              {{ t('kb.article.delete') }}
            </BaseButton>
          </div>
        </div>
      </template>

      <div class="article-meta">
        <BaseBadge v-if="article.category" variant="gray" :label="localizedName(article.category)" />
        <BaseBadge v-if="!article.isPublished" variant="warning" :label="t('kb.draft')" />
        <span class="updated">{{ t('kb.article.updated') }}: {{ formatDate(article.updatedAt) }}</span>
        <button type="button" class="lang-toggle" @click="viewLang = viewLang === 'en' ? 'ar' : 'en'">
          {{ t('kb.article.viewIn') }}: {{ viewLang === 'en' ? t('common.arabic') : t('common.english') }}
        </button>
      </div>

      <h2 class="article-title" :dir="viewLang === 'ar' ? 'rtl' : 'ltr'">
        {{ viewLang === 'ar' ? article.titleAr : article.titleEn }}
      </h2>
      <div class="article-body" :dir="viewLang === 'ar' ? 'rtl' : 'ltr'">{{ viewLang === 'ar' ? article.bodyAr : article.bodyEn }}</div>
    </BaseCard>

    <KbArticleForm
      v-if="showEdit && article"
      :categories="categories"
      :article="article"
      @close="showEdit = false"
      @saved="onSaved"
    />

    <BaseDialog :is-open="showDelete" :title="t('kb.article.confirmDelete')" @close="showDelete = false">
      <p class="delete-message">{{ article ? localizedName({ nameEn: article.titleEn, nameAr: article.titleAr }) : '' }}</p>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showDelete = false">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="danger" size="md" type="button" :loading="deleting" @click="submitDelete">
          {{ t('common.delete') }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { useAppStore } from '@/stores/app.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import KbArticleForm from '@/components/kb/KbArticleForm.vue'

interface Category {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface Article {
  id: string
  categoryId: string | null
  category: Category | null
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  isPublished: boolean
  sortOrder: number
  updatedAt: Date
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const appStore = useAppStore()
const localizedName = useLocalizedName()
const { formatDate } = useFormat()
const { messageFor } = useApiError()

const article = ref<Article | null>(null)
const categories = ref<Category[]>([])
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')
const viewLang = ref<'en' | 'ar'>(locale.value === 'ar' ? 'ar' : 'en')

const showEdit = ref(false)
const showDelete = ref(false)
const publishing = ref(false)
const deleting = ref(false)

async function loadArticle() {
  loading.value = true
  notFound.value = false
  loadError.value = ''
  try {
    const response = await api.get(`/kb/articles/${route.params.id}`)
    article.value = {
      ...response.data,
      updatedAt: new Date(response.data.updatedAt),
    }
    appStore.setBreadcrumbItemLabel(
      localizedName({ nameEn: response.data.titleEn, nameAr: response.data.titleAr }),
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound.value = true
    } else {
      loadError.value = messageFor(err)
    }
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  if (!auth.can('kb.manage')) return
  try {
    const response = await api.get('/kb/categories')
    categories.value = response.data
  } catch {
    // Only feeds the edit form's category picker — a failure here is not fatal to reading the article.
  }
}

function onSaved() {
  showEdit.value = false
  loadArticle()
}

async function togglePublish(publish: boolean) {
  if (!article.value) return
  publishing.value = true
  try {
    await api.post(`/kb/articles/${article.value.id}/${publish ? 'publish' : 'unpublish'}`)
    await loadArticle()
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    publishing.value = false
  }
}

async function submitDelete() {
  if (!article.value) return
  deleting.value = true
  try {
    await api.delete(`/kb/articles/${article.value.id}`)
    router.push({ name: 'kb' })
  } catch (err) {
    loadError.value = messageFor(err)
    showDelete.value = false
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadArticle()
  loadCategories()
})
// Clear on unmount, or the next screen's breadcrumb shows this record's name.
onUnmounted(() => appStore.setBreadcrumbItemLabel(''))
</script>

<style scoped>
.kb-article-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.centered {
  display: flex;
  justify-content: center;
  padding: var(--spacing-8);
}

.error-state {
  padding: var(--spacing-4);
  color: var(--color-danger);
  line-height: 1.6;
}

.error-state a {
  color: var(--color-primary);
  text-decoration: underline;
}

.error-text {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.actions {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-4);
}

.updated {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.lang-toggle {
  margin-inline-start: auto;
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  padding: 0;
}

.article-title {
  margin: 0 0 var(--spacing-4);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.article-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
  color: var(--color-gray-900);
}

.delete-message {
  padding: var(--spacing-3);
  background-color: var(--color-danger-50);
  border-inline-start: 4px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  margin: 0;
  font-size: var(--font-size-sm);
}
</style>
