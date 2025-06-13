/**
 * Common types for Zustand stores
 */

/**
 * Generic error type for store operations
 */
export interface StoreError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

/**
 * Loading state with optional context
 */
export interface LoadingState {
  isLoading: boolean;
  loadingKey?: string;
  loadingMessage?: string;
}

/**
 * Base modal data types
 */
export interface ConfirmModalData {
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export interface AlertModalData {
  okText?: string;
}

export type ModalData = ConfirmModalData | AlertModalData | Record<string, unknown>;

/**
 * Filter change event for tracking
 */
export interface FilterChangeEvent<T = unknown> {
  filterType: string;
  oldValue: T;
  newValue: T;
  timestamp: Date;
}

/**
 * Persistence configuration
 */
export interface PersistConfig {
  key: string;
  version: number;
  migrate?: (persistedState: any, version: number) => any;
}