import { useI18n } from 'vue-i18n'

interface BilingualEntity {
  nameEn?: string | null
  nameAr?: string | null
}

export function useLocalizedName() {
  const { locale } = useI18n()

  return (entity: BilingualEntity): string => {
    if (locale.value === 'ar') {
      return entity.nameAr || entity.nameEn || ''
    }
    return entity.nameEn || entity.nameAr || ''
  }
}
