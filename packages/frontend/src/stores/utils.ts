/**
 * Utility functions for Zustand stores
 */

/**
 * Generates a unique ID for entities
 * @param prefix - Optional prefix for the ID
 * @returns A unique string ID
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Safe state setter that handles errors gracefully
 * @param setter - The Zustand set function
 * @param updater - The state update function
 * @param errorMessage - Optional error message for logging
 */
export const safeSet = <T>(
  setter: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void,
  updater: T | Partial<T> | ((state: T) => T | Partial<T>),
  errorMessage = 'State update failed'
): void => {
  try {
    setter(updater);
  } catch (error) {
    console.error(errorMessage, error);
  }
};

/**
 * Creates a debounced version of a function
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Type guard for checking if a value is defined
 * @param value - Value to check
 * @returns true if value is not null or undefined
 */
export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * Safely parses a value from localStorage
 * @param key - Storage key
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed value or fallback
 */
export const safeParseJSON = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Failed to parse localStorage item: ${key}`, error);
    return fallback;
  }
};

/**
 * Safely stringifies and stores a value in localStorage
 * @param key - Storage key
 * @param value - Value to store
 * @returns true if successful, false otherwise
 */
export const safeStringifyJSON = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to store localStorage item: ${key}`, error);
    return false;
  }
};