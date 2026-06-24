<template>
  <div class="chart-card">
    <div class="chart-card__header">
      <h3 class="chart-card__title">{{ title }}</h3>
      <div v-if="loading" class="chart-card__loading">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>
    </div>
    <v-chart v-if="hasData" :option="option" :autoresize="true" class="chart-canvas" />
    <div v-else class="chart-empty">{{ $t('chart.noData') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import dayjs from 'dayjs';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps<{
  title: string;
  series: Array<{ date: string; testing: number; inspection: number; certification: number }>;
  loading?: boolean;
}>();

const hasData = computed(() => props.series && props.series.length > 0);

const option = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { bottom: 0, icon: 'roundRect' },
  grid: { left: 50, right: 20, top: 20, bottom: 50 },
  xAxis: {
    type: 'category',
    data: props.series.map((s) => dayjs(s.date).format('MM-DD')),
    axisLine: { lineStyle: { color: '#999' } },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
  },
  series: [
    {
      name: 'Testing',
      type: 'line',
      smooth: true,
      data: props.series.map((s) => s.testing),
      itemStyle: { color: '#ca4300' },
      areaStyle: { color: 'rgba(202,67,0,0.08)' },
    },
    {
      name: 'Inspection',
      type: 'line',
      smooth: true,
      data: props.series.map((s) => s.inspection),
      itemStyle: { color: '#f49000' },
    },
    {
      name: 'Certification',
      type: 'line',
      smooth: true,
      data: props.series.map((s) => s.certification),
      itemStyle: { color: '#0284c7' },
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.chart-card__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}
.chart-card__loading {
  color: var(--color-text-muted);
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
  font-size: 14px;
}
.is-loading {
  animation: rotating 2s linear infinite;
}
@keyframes rotating {
  to { transform: rotate(360deg); }
}
</style>
