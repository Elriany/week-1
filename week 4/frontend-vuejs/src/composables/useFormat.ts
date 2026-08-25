import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function useFormat() {
  const { locale } = useI18n()

  const dateFormatter = computed(() => {
    return new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory',
    })
  })

  const timeFormatter = computed(() => {
    return new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      calendar: 'gregory',
    })
  })

  const numberFormatter = computed(() => {
    return new Intl.NumberFormat(locale.value === 'ar' ? 'ar-SA' : 'en-US')
  })

  const currencyFormatter = computed(() => {
    return new Intl.NumberFormat(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
    })
  })

  function formatDate(date: Date | string | number): string {
    return dateFormatter.value.format(typeof date === 'string' || typeof date === 'number' ? new Date(date) : date)
  }

  function formatTime(date: Date | string | number): string {
    return timeFormatter.value.format(typeof date === 'string' || typeof date === 'number' ? new Date(date) : date)
  }

  function formatDateTime(date: Date | string | number): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    return `${formatDate(d)} ${formatTime(d)}`
  }

  function formatNumber(value: number): string {
    return numberFormatter.value.format(value)
  }

  function formatCurrency(value: number): string {
    return currencyFormatter.value.format(value)
  }

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    formatCurrency,
  }
}
