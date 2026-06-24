<template>
  <div class="chart-card">
    <div class="chart-card__header">
      <h3 class="chart-card__title">{{ title }}</h3>
    </div>
    <v-chart v-if="hasData" :option="option" :autoresize="true" class="chart-canvas" />
    <div v-else class="chart-empty">{{ $t('chart.noData') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent]);

const props = defineProps<{
  title: string;
  items: Array<{ category: string; count: number; percentage: number }>;
}>();

const hasData = computed(() => props.items && props.items.length > 0);

const colorMap: Record<string, string> = {
  testing: '#ca4300',
  inspection: '#f49000',
  certification: '#0284c7',
};

const option = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (p: any) => `${p.name}<br/>${p.value.toLocaleString()} (${p.percent}%)`,
  },
  legend: { bottom: 0, icon: 'circle' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
      data: props.items.map((i) => ({
        name: i.category,
        value: i.count,
        itemStyle: { color: colorMap[i.category] || '#999' },
      })),
    },
  ],
}));
</script>

<style scoped>
.chart-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  min-height: 320px;
  display: flex;
  flex-direction: column;
}
.chart-card__header {
  margin-bottom: var(--space-4);
}
.chart-card__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}
.chart-canvas {
  flex: 1;
  min-height: 260px;
}
.chart-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
</style>
