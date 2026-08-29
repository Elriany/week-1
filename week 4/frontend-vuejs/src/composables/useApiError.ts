import { useI18n } from 'vue-i18n'
import { ApiError } from '@/types/api'

/**
 * Per-view overrides, keyed by HTTP status. Checked before the shared
 * defaults, so a view can give 409 or 422 its own specific message without
 * touching the common 403/0 handling every view shares.
 */
export type ApiErrorOverrides = Partial<Record<number, string>>

export function useApiError() {
  const { t } = useI18n()

  function messageFor(err: unknown, overrides?: ApiErrorOverrides): string {
    if (err instanceof ApiError) {
      const override = overrides?.[err.status]
      if (override) return t(override)
      if (err.status === 403) return t('errors.forbidden')
      if (err.status === 0) return t('errors.unreachable')
      return err.serverMessage ?? t('errors.unreachable')
    }
    return t('errors.unreachable')
  }

  return { messageFor }
}
