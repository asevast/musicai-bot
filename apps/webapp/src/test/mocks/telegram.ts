import { vi } from 'vitest';

export const mockMount = vi.fn().mockResolvedValue(undefined);
export const mockUnmount = vi.fn().mockResolvedValue(undefined);

export const miniApp = {
  mount: mockMount,
  unmount: mockUnmount,
};

export const themeParams = {
  mount: mockMount,
  unmount: mockUnmount,
};

export const viewport = {
  mount: mockMount,
  unmount: mockUnmount,
  expand: vi.fn(),
};

export const backButton = {
  mount: mockMount,
  unmount: mockUnmount,
};

export const retrieveLaunchParams = vi.fn(() => ({
  initData: {},
  initDataRaw: 'test-init-data',
  startParam: '',
  user: { id: 123456, firstName: 'Test', lastName: 'User', username: 'testuser' },
}));

export const init = vi.fn().mockResolvedValue(undefined);

export function useLaunchParams() {
  return {
    initData: {},
    initDataRaw: 'test-init-data',
    startParam: '',
    user: { id: 123456, firstName: 'Test', lastName: 'User', username: 'testuser' },
  };
}

export function useInitials() {
  return 'TU';
}

export function useThemeParams() {
  return {};
}

export function useBackButton() {
  return {
    mount: mockMount,
    unmount: mockUnmount,
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
  };
}

export function useMainButton() {
  return {
    mount: mockMount,
    unmount: mockUnmount,
    setText: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
  };
}
