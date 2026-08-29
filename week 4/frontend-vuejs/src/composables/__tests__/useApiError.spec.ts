import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useApiError, type ApiErrorOverrides } from '../useApiError'
import { ApiError } from '@/types/api'
import { i18n } from '@/i18n'

/**
 * `useI18n()` requires an active component setup context, so the composable
 * is exercised through a throwaway host component rather than called bare.
 */
function withApiError(): ReturnType<typeof useApiError> {
  let result!: ReturnType<typeof useApiError>
  const Host = defineComponent({
    setup() {
      result = useApiError()
      return () => h('div')
    },
  })
  mount(Host, { global: { plugins: [i18n] } })
  return result
}

describe('useApiError', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('maps 403 to the forbidden message', () => {
    const { messageFor } = withApiError()
    expect(messageFor(new ApiError(403, 'FORBIDDEN'))).toBe('You do not have permission to perform this action')
  })

  it('maps status 0 to the unreachable message', () => {
    const { messageFor } = withApiError()
    expect(messageFor(new ApiError(0, 'NETWORK_ERROR'))).toBe('Cannot reach the server')
  })

  it('lets an override win over the default mapping', () => {
    const { messageFor } = withApiError()
    const overrides: ApiErrorOverrides = { 409: 'customers.errors.codeTaken' }
    expect(messageFor(new ApiError(409, 'CONFLICT'), overrides)).toBe('A customer with this code already exists')
  })

  it('lets an override win even for a status the defaults also handle', () => {
    const { messageFor } = withApiError()
    const overrides: ApiErrorOverrides = { 403: 'customers.errors.codeTaken' }
    expect(messageFor(new ApiError(403, 'FORBIDDEN'), overrides)).toBe('A customer with this code already exists')
  })

  it('falls back to the server message for an unmapped status', () => {
    const { messageFor } = withApiError()
    const err = new ApiError(409, 'CONFLICT', undefined, undefined, 'Something specific went wrong')
    expect(messageFor(err)).toBe('Something specific went wrong')
  })

  it('falls back to the unreachable message when there is no server message', () => {
    const { messageFor } = withApiError()
    expect(messageFor(new ApiError(500, 'INTERNAL'))).toBe('Cannot reach the server')
  })

  it('treats a non-ApiError as unreachable', () => {
    const { messageFor } = withApiError()
    expect(messageFor(new Error('boom'))).toBe('Cannot reach the server')
  })
})
