<template>
  <div class="filter-bar">
    <el-radio-group v-model="range" @change="$emit('update:range', $event)">
      <el-radio-button value="7d">{{ $t('filter.range7d') }}</el-radio-button>
      <el-radio-button value="30d">{{ $t('filter.range30d') }}</el-radio-button>
      <el-radio-button value="90d">{{ $t('filter.range90d') }}</el-radio-button>
    </el-radio-group>

    <el-select
      :model-value="category"
      @update:model-value="$emit('update:category', $event)"
      class="filter-bar__select"
    >
      <el-option value="all" :label="$t('filter.all')" />
      <el-option value="testing" :label="$t('filter.testing')" />
      <el-option value="inspection" :label="$t('filter.inspection')" />
      <el-option value="certification" :label="$t('filter.certification')" />
    </el-select>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  range: string;
  category: string;
}>();

defineEmits<{
  (e: 'update:range', v: string): void;
  (e: 'update:category', v: string): void;
}>();
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
}
.filter-bar__select {
  width: 160px;
}
</style>
