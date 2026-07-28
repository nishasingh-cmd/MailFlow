/**
 * Shared types for MailFlow — used by both frontend and backend.
 * Full type definitions will be added in subsequent phases per the
 * Technical Architecture Document (Section 7: Database schema).
 */

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp?: string;
}
