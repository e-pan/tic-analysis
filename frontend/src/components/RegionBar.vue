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
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);

const props = defineProps<{
  title: string;
  items: Array<{ region: string; count: number }>;
}>();

const hasData = computed(() => props.items && props.items.length > 0);

// Sort descending, take top 10
const sorted = computed(() => [...props.items].sort((a, b) => b.count - a.count).slice(0, 10));

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
  },
  grid: { left: 100, right: 30, top: 20, bottom: 30 },
  xAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
  },
  yAxis: {
    type: 'category',
    data: sorted.value.map((i) => i.region).reverse(),
    axisLine: { lineStyle: { color: '#999' } },
  },
  series: [
    {
      type: 'bar',
      data: sorted.value.map((i) => i.count).reverse(),
      itemStyle: {
        color: '#ca4300',
        borderRadius: [0, 4, 4, 0],
      },
      barWidth: 18,
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
  min-height: 360px;
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
  min-height: 300px;
}
.chart-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
</style>
