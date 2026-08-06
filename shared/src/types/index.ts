export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp?: string;
}

export * from './lead.types';
export * from './delivery.types';
export * from './whatsapp.types';
export * from './settings.types';
export * from './analytics.types';
