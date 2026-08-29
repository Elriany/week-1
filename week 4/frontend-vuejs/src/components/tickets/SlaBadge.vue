<template>
  <BaseBadge v-if="sla" :variant="variant" :label="label" />
</template>

<script setup lang="ts">
/**
 * Renders nothing when `sla` is null — a ticket whose priority has no policy
 * has no target, and a neutral badge would imply one.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseBadge from '@/components/ui/BaseBadge.vue'

const props = defineProps<{
  sla: { status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET' } | null
}>()

const { t } = useI18n()

type BadgeVariant = 'primary' | 'info' | 'success' | 'danger' | 'warning' | 'gray'

const VARIANT_BY_STATUS: Record<string, BadgeVariant> = {
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  BREACHED: 'danger',
  MET: 'gray',
}

const variant = computed<BadgeVariant>(() => VARIANT_BY_STATUS[props.sla?.status ?? ''] ?? 'gray')
const label = computed(() => t(`tickets.sla.status.${props.sla?.status}`))
</script>
