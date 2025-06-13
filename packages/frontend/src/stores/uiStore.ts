import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateId } from './utils';
import type { ModalData } from './types';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ModalType = 'confirm' | 'alert' | 'custom';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface Modal {
  isOpen: boolean;
  type?: ModalType;
  title?: string;
  message?: string;
  data?: ModalData;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface UIState {
  // Loading state
  isLoading: boolean;
  loadingMessage?: string;
  loadingStack: Set<string>;
  
  // Modal state
  modal: Modal;
  
  // Toast notifications
  toasts: Toast[];
  
  // Sidebar/Navigation state
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  
  // Actions - Loading
  setLoading: (loading: boolean, message?: string) => void;
  startLoading: (key: string, message?: string) => void;
  stopLoading: (key: string) => void;
  
  // Actions - Modal
  /**
   * Shows a modal dialog with the provided configuration
   * @param modal - Partial modal configuration to merge with defaults
   */
  showModal: (modal: Partial<Modal>) => void;
  closeModal: () => void;
  
  // Actions - Toast
  /**
   * Shows a toast notification
   * @param message - The message to display
   * @param type - Type of toast (success, error, info, warning)
   * @param options - Additional toast options
   */
  showToast: (message: string, type?: ToastType, options?: Partial<Toast>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Actions - Navigation
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  
  // Actions - Reset
  resetUI: () => void;
}

// Initial states
const initialModalState: Modal = {
  isOpen: false,
  type: undefined,
  title: undefined,
  message: undefined,
  data: undefined,
  onConfirm: undefined,
  onCancel: undefined,
};

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isLoading: false,
      loadingMessage: undefined,
      loadingStack: new Set(),
      modal: initialModalState,
      toasts: [],
      isSidebarOpen: true,
      isMobileMenuOpen: false,
      
      // Loading actions
      setLoading: (loading, message) => 
        set({ 
          isLoading: loading, 
          loadingMessage: message,
          loadingStack: loading ? new Set(['global']) : new Set(),
        }),
      
      startLoading: (key, message) =>
        set((state) => {
          const newStack = new Set(state.loadingStack);
          newStack.add(key);
          return {
            isLoading: true,
            loadingMessage: message || state.loadingMessage,
            loadingStack: newStack,
          };
        }),
      
      stopLoading: (key) =>
        set((state) => {
          const newStack = new Set(state.loadingStack);
          newStack.delete(key);
          return {
            isLoading: newStack.size > 0,
            loadingMessage: newStack.size > 0 ? state.loadingMessage : undefined,
            loadingStack: newStack,
          };
        }),
      
      // Modal actions
      showModal: (modal) =>
        set({ 
          modal: { 
            ...initialModalState,
            ...modal,
            isOpen: true,
          } 
        }),
      
      closeModal: () =>
        set({ modal: initialModalState }),
      
      // Toast actions
      showToast: (message, type = 'info', options = {}) => {
        const id = options.id || generateId('toast');
        const toast: Toast = {
          id,
          message,
          type,
          duration: options.duration ?? 5000,
          action: options.action,
        };
        
        set((state) => ({
          toasts: [...state.toasts, toast],
        }));
        
        // Auto-remove toast after duration
        if (toast.duration && toast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, toast.duration);
          
          // Note: In a production app, you might want to track these timeouts
          // for cleanup on unmount, but Zustand handles store lifecycle
        }
      },
      
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
      
      clearToasts: () =>
        set({ toasts: [] }),
      
      // Navigation actions
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      setSidebarOpen: (open) =>
        set({ isSidebarOpen: open }),
      
      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      
      setMobileMenuOpen: (open) =>
        set({ isMobileMenuOpen: open }),
      
      // Reset action
      resetUI: () =>
        set({
          isLoading: false,
          loadingMessage: undefined,
          loadingStack: new Set(),
          modal: initialModalState,
          toasts: [],
          isSidebarOpen: true,
          isMobileMenuOpen: false,
        }),
    }),
    {
      name: 'ui-store',
    }
  )
);

// Selectors for common use cases
export const useIsLoading = () => useUIStore((state) => state.isLoading);
export const useModal = () => useUIStore((state) => state.modal);
export const useToasts = () => useUIStore((state) => state.toasts);