<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <div class="dashboard__title-wrap">
        <h1 class="dashboard__title">{{ $t('app.title') }}</h1>
        <span class="dashboard__subtitle">{{ $t('app.subtitle') }}</span>
      </div>
      <div class="dashboard__meta">
        <span class="dashboard__updated">
          {{ $t('app.lastUpdated') }}: {{ lastUpdatedStr }}
        </span>
        <el-button :icon="Refresh" circle size="small" :loading="loading" @click="refreshAll" />
      </div>
    </header>

    <section class="dashboard__filters">
      <FilterBar v-model:range="range" v-model:category="category" />
    </section>

    <section class="dashboard__kpis">
      <KpiCard
        :title="$t('kpi.totalCount')"
        :value="kpi?.totalCount ?? 0"
        :delta="kpi?.totalCountDelta"
        :hint="$t('kpi.totalCount') + ' vs prev'"
      />
      <KpiCard
        :title="$t('kpi.passRate')"
        :value="kpi ? (kpi.passRate * 100).toFixed(1) : '0'"
        suffix="%"
        :delta="kpi?.passRateDelta"
      />
      <KpiCard
        :title="$t('kpi.inProgress')"
        :value="kpi?.inProgressCount ?? 0"
        :delta="kpi?.inProgressDelta"
      />
      <KpiCard
        :title="$t('kpi.avgTurnaround')"
        :value="kpi?.avgTurnaroundDays ?? 0"
        :precision="1"
        :suffix="$t('kpi.days')"
      >
        <template #benchmark>
          {{ $t('kpi.benchmark') }}: {{ kpi?.avgTurnaroundBenchmark ?? '—' }} {{ $t('kpi.days') }}
        </template>
      </KpiCard>
    </section>

    <section class="dashboard__charts-row">
      <TrendChart :title="$t('chart.trend')" :series="trend?.series ?? []" :loading="loading" />
      <CategoryPie :title="$t('chart.category')" :items="categoryData?.items ?? []" />
    </section>

    <section class="dashboard__charts-full">
      <RegionBar :title="$t('chart.region')" :items="regionData?.items ?? []" />
    </section>

    <el-alert
      v-if="errorMsg"
      :title="$t('app.error')"
      type="warning"
      :description="errorMsg"
      show-icon
      :closable="false"
      class="dashboard__error"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import KpiCard from '@/components/KpiCard.vue';
import TrendChart from '@/components/TrendChart.vue';
import CategoryPie from '@/components/CategoryPie.vue';
import RegionBar from '@/components/RegionBar.vue';
import FilterBar from '@/components/FilterBar.vue';
import { metricsApi } from '@/api/metrics';
import { useAutoRefresh } from '@/composables/useAutoRefresh';

const range = ref('7d');
const category = ref('all');

const kpi = ref<any>(null);
const trend = ref<any>(null);
const categoryData = ref<any>(null);
const regionData = ref<any>(null);
const errorMsg = ref<string | null>(null);

const fetchAll = async () => {
  errorMsg.value = null;
  try {
    const [k, t, c, r] = await Promise.all([
      metricsApi.kpi(),
      metricsApi.trend(range.value, category.value),
      metricsApi.category('30d'),
      metricsApi.region('30d', 10),
    ]);
    kpi.value = k.data;
    trend.value = t.data;
    categoryData.value = c.data;
    regionData.value = r.data;
  } catch (err: any) {
    errorMsg.value = err.message || 'Unknown error';
  }
};

const { loading, lastUpdated, run } = useAutoRefresh(fetchAll, { interval: 300_000 });

const refreshAll = () => run();

const lastUpdatedStr = computed(() => {
  if (!lastUpdated.value) return '—';
  return dayjs(lastUpdated.value).format('YYYY-MM-DD HH:mm:ss');
});

// Refetch trend when filters change (KPI/category/region use different params)
watch([range, category], () => {
  metricsApi.trend(range.value, category.value).then((t) => (trend.value = t.data));
});
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.dashboard__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.dashboard__title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: var(--color-text-primary);
}
.dashboard__subtitle {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-left: var(--space-3);
}
.dashboard__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 13px;
  color: var(--color-text-secondary);
}
.dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}
.dashboard__charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
}
.dashboard__charts-full {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}
.dashboard__error {
  margin-top: var(--space-4);
}

@media (max-width: 900px) {
  .dashboard__charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
