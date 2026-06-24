import { ref, onUnmounted, watch } from 'vue';

export interface UseAutoRefreshOptions {
  interval?: number; // ms, default 5min
  immediate?: boolean; // run immediately on mount
}

export function useAutoRefresh(fetcher: () => Promise<any>, options: UseAutoRefreshOptions = {}) {
  const { interval = 300_000, immediate = true } = options;
  const loading = ref(false);
  const lastUpdated = ref<Date | null>(null);
  const error = ref<Error | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  const run = async () => {
    if (loading.value) return; // prevent overlap
    loading.value = true;
    error.value = null;
    try {
      await fetcher();
      lastUpdated.value = new Date();
    } catch (err: any) {
      error.value = err;
      console.error('[AutoRefresh] fetch failed:', err.message);
    } finally {
      loading.value = false;
    }
  };

  const start = () => {
    stop();
    timer = setInterval(run, interval);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  if (immediate) run().then(start);

  onUnmounted(stop);

  return { loading, lastUpdated, error, run, start, stop };
}
