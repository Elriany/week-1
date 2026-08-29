<template>
  <div class="kb-view">
    <BaseCard>
      <template #header>
        <div class="card-header">
          <h3>{{ t('kb.title') }}</h3>
          <BaseButton
            v-if="auth.can('kb.manage')"
            variant="primary"
            size="md"
            type="button"
            @click="showCreate = true"
          >
            {{ t('kb.newArticle') }}
          </BaseButton>
        </div>
      </template>

      <p class="page-subtitle">{{ t('kb.subtitle') }}</p>

      <div class="filters">
        <BaseInput v-model="search" type="search" :label="t('kb.search')" />
        <label class="select-field">
          <span>{{ t('tickets.columns.category') }}</span>
          <select v-model="categoryFilter">
            <option value="">{{ t('kb.allCategories') }}</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ localizedName(category) }}
            </option>
          </select>
        </label>
        <label v-if="auth.can('kb.manage')" class="checkbox-field">
          <input v-model="includeDrafts" type="checkbox" />
          {{ t('kb.includeDrafts') }}
        </label>
      </div>

      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <EmptyState
        v-else-if="articles.length === 0 && !search.trim()"
        :title="t('kb.empty.title')"
        :description="t('kb.empty.description')"
      />

      <EmptyState
        v-else-if="articles.length === 0 && search.trim()"
        :title="t('kb.noResults.title')"
        :description="t('kb.noResults.description')"
      />

      <div v-else class="article-grid">
        <RouterLink
          v-for="article in articles"
          :key="article.id"
          :to="{ name: 'kb-article', params: { id: article.id } }"
          class="article-card"
        >
          <div class="article-card-header">
            <h4>{{ localizedTitle(article) }}</h4>
            <BaseBadge v-if="!article.isPublished" variant="warning" :label="t('kb.draft')" />
          </div>
          <BaseBadge v-if="article.category" variant="gray" :label="localizedName(article.category)" />
          <p class="excerpt">{{ localizedExcerpt(article) }}</p>
          <span class="updated">{{ t('kb.article.updated') }}: {{ formatDate(article.updatedAt) }}</span>
        </RouterLink>
      </div>

      <div v-if="articles.length > 0" class="pagination">
        <BaseButton variant="secondary" size="sm" type="button" :disabled="page === 1" @click="page = Math.max(1, page - 1)">
          {{ t('customers.previous') }}
        </BaseButton>
        <span class="pagination-info">
          {{ t('customers.showing', { start: formatNumber((page - 1) * PAGE_SIZE + 1), end: formatNumber(Math.min(page * PAGE_SIZE, total)), total: formatNumber(total) }) }}
        </span>
        <BaseButton variant="secondary" size="sm" type="button" :disabled="page * PAGE_SIZE >= total" @click="page = page + 1">
          {{ t('customers.next') }}
        </BaseButton>
      </div>
    </BaseCard>

    <KbArticleForm
      v-if="showCreate"
      :categories="categories"
      @close="showCreate = false"
      @saved="onCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import KbArticleForm from '@/components/kb/KbArticleForm.vue'

const PAGE_SIZE = 20

interface Category {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface ArticleSummary {
  id: string
  categoryId: string | null
  category: Category | null
  titleEn: string
  titleAr: string
  excerptEn: string
  excerptAr: string
  isPublished: boolean
  updatedAt: Date
}

const { t } = useI18n()
const auth = useAuthStore()
const localizedName = useLocalizedName()
const { formatDate, formatNumber } = useFormat()
const { messageFor } = useApiError()

const articles = ref<ArticleSummary[]>([])
const categories = ref<Category[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const categoryFilter = ref('')
const includeDrafts = ref(false)
const loading = ref(true)
const loadError = ref('')
const showCreate = ref(false)

let requestSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

function localizedTitle(article: ArticleSummary): string {
  return localizedName({ nameEn: article.titleEn, nameAr: article.titleAr })
}

function localizedExcerpt(article: ArticleSummary): string {
  return localizedName({ nameEn: article.excerptEn, nameAr: article.excerptAr })
}

async function loadArticles() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (categoryFilter.value) params.set('categoryId', categoryFilter.value)
    if (auth.can('kb.manage') && includeDrafts.value) params.set('includeUnpublished', 'true')
    params.set('page', String(page.value))
    params.set('pageSize', String(PAGE_SIZE))

    const response = await api.get(`/kb/articles?${params}`)
    if (seq !== requestSeq) return
    articles.value = response.data.items
    total.value = response.data.total
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

async function loadCategories() {
  try {
    const response = await api.get('/kb/categories')
    categories.value = response.data
  } catch {
    // Category filter degrades to empty — the article list error banner already covers the failure.
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  page.value = 1
  searchTimer = setTimeout(loadArticles, 300)
})

watch([categoryFilter, includeDrafts, page], loadArticles)

function onCreated() {
  showCreate.value = false
  page.value = 1
  loadArticles()
}

onMounted(() => {
  Promise.all([loadCategories(), loadArticles()])
})

onUnmounted(() => clearTimeout(searchTimer))
</script>

<style scoped>
.kb-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.filters {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
  align-items: flex-end;
}

.filters > :deep(div) {
  flex: 1;
  min-width: 250px;
}

.select-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.select-field select {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  padding-block-end: var(--spacing-2);
}

.centered {
  display: flex;
  justify-content: center;
  padding: var(--spacing-8);
}

.error-text {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: var(--spacing-4);
}

.article-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  color: inherit;
  transition: all var(--transition-base);
}

.article-card:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-50);
}

.article-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.article-card-header h4 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.excerpt {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
  overflow-wrap: anywhere;
}

.updated {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
  flex-wrap: wrap;
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-gray-700);
  white-space: nowrap;
}
</style>
