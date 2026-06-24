<template>
  <div class="kpi-card" :class="trendClass">
    <div class="kpi-card__title">{{ title }}</div>
    <div class="kpi-card__value">
      <span class="kpi-card__number">{{ formatted }}</span>
      <span v-if="suffix" class="kpi-card__suffix">{{ suffix }}</span>
    </div>
    <div v-if="delta !== undefined && delta !== null" class="kpi-card__delta">
      <span :class="['delta-arrow', delta >= 0 ? 'up' : 'down']">
        {{ delta >= 0 ? '↑' : '↓' }}
      </span>
      <span>{{ Math.abs(delta).toFixed(1) }}%</span>
      <span class="kpi-card__hint">{{ hint }}</span>
    </div>
    <div v-if="$slots.benchmark" class="kpi-card__benchmark">
      <slot name="benchmark" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  value: number | string;
  suffix?: string;
  delta?: number; // percent
  hint?: string;
  precision?: number;
  trendClass?: 'neutral' | 'good-up' | 'good-down';
}>();

const formatted = computed(() => {
  if (typeof props.value === 'string') return props.value;
  if (props.value >= 1000) return props.value.toLocaleString('en-US');
  if (props.precision !== undefined) return props.value.toFixed(props.precision);
  return Math.round(props.value).toString();
});
</script>

<style scoped>
.kpi-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.kpi-card__title {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.kpi-card__value {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.kpi-card__number {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}
.kpi-card__suffix {
  font-size: 14px;
  color: var(--color-text-muted);
}
.kpi-card__delta {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 13px;
  color: var(--color-text-secondary);
}
.kpi-card__hint {
  margin-left: var(--space-2);
  color: var(--color-text-muted);
}
.delta-arrow.up { color: var(--color-success); }
.delta-arrow.down { color: var(--color-error); }
.kpi-card__benchmark {
  font-size: 12px;
  color: var(--color-text-muted);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
</style>
