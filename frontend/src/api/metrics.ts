import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : '/api',
  timeout: 10_000,
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('[API]', err.config?.url, err.message);
    return Promise.reject(err);
  },
);

export interface KpiResponse {
  data: {
    totalCount: number;
    totalCountDelta: number;
    passRate: number;
    passRateDelta: number;
    inProgressCount: number;
    inProgressDelta: number;
    avgTurnaroundDays: number;
    avgTurnaroundBenchmark: number;
    asOf: string;
  };
}

export interface TrendResponse {
  data: {
    series: Array<{ date: string; testing: number; inspection: number; certification: number }>;
    asOf: string;
  };
}

export interface CategoryResponse {
  data: {
    items: Array<{ category: string; count: number; percentage: number }>;
    asOf: string;
  };
}

export interface RegionResponse {
  data: {
    items: Array<{ region: string; count: number }>;
    asOf: string;
  };
}

export const metricsApi = {
  kpi: (date?: string) => http.get<KpiResponse>('/metrics/kpi', { params: { date } }).then((r) => r.data),
  trend: (range = '7d', category = 'all') =>
    http.get<TrendResponse>('/metrics/trend', { params: { range, category } }).then((r) => r.data),
  category: (range = '30d') =>
    http.get<CategoryResponse>('/metrics/category', { params: { range } }).then((r) => r.data),
  region: (range = '30d', top = 10) =>
    http.get<RegionResponse>('/metrics/region', { params: { range, top } }).then((r) => r.data),
};
