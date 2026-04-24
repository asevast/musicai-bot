/**
 * Telegram WebApp Testing Utilities
 *
 * Provides mocks and helpers for testing Telegram Mini Apps
 * including SDK initialization, launch params, and viewport handling.
 */

import { vi } from 'vitest';
import { ReactNode } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface LaunchParams {
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
  query_id?: string;
  start_param?: string;
}

/**
 * Default mock launch params for testing
 */
export const defaultLaunchParams: LaunchParams = {
  user: {
    id: 123456,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en',
    is_premium: false,
  },
  auth_date: Math.floor(Date.now() / 1000),
  hash: 'mock-hash',
  query_id: 'mock-query-id',
  start_param: '',
};

/**
 * Mock Telegram WebApp SDK
 * Call this in your test setup or beforeEach
 */
export function mockTelegramWebApp(launchParams: LaunchParams = defaultLaunchParams) {
  const mockMount = vi.fn().mockResolvedValue(undefined);
  const mockUnmount = vi.fn().mockResolvedValue(undefined);
  const mockExpand = vi.fn();
  const mockShow = vi.fn();
  const mockHide = vi.fn();
  const mockEnable = vi.fn();
  const mockDisable = vi.fn();

  // Mock @telegram-apps/sdk-react
  vi.mock('@telegram-apps/sdk-react', () => ({
    init: vi.fn().mockImplementation(() => {
      console.log('[MOCK] Telegram SDK initialized');
      return Promise.resolve();
    }),

    miniApp: {
      mount: mockMount,
      unmount: mockUnmount,
      ready: vi.fn(),
      get isMounted() { return true; },
    },

    themeParams: {
      mount: mockMount,
      unmount: mockUnmount,
      get isMounted() { return true; },
      get backgroundColor() { return '#ffffff'; },
      get textColor() { return '#000000'; },
      get hintColor() { return '#999999'; },
      get linkColor() { return '#5B5FC7'; },
      get buttonColor() { return '#5B5FC7'; },
      get buttonTextColor() { return '#ffffff'; },
    },

    viewport: {
      mount: mockMount,
      unmount: mockUnmount,
      expand: mockExpand,
      get isMounted() { return true; },
      get isExpanded() { return true; },
      get height() { return 800; },
      get width() { return 400; },
      get stableHeight() { return 800; },
      get contentSafeAreaInset() {
        return { top: 0, bottom: 0, left: 0, right: 0 };
      },
      get safeAreaInset() {
        return { top: 0, bottom: 0, left: 0, right: 0 };
      },
    },

    backButton: {
      mount: mockMount,
      unmount: mockUnmount,
      show: mockShow,
      hide: mockHide,
      enable: mockEnable,
      disable: mockDisable,
      onClick: vi.fn((callback) => {
        // Store callback for manual triggering in tests
        (backButton as unknown as { _callback?: () => void })._callback = callback;
      }),
      set isVisible(value: boolean) {},
    },

    mainButton: {
      mount: mockMount,
      unmount: mockUnmount,
      show: mockShow,
      hide: mockHide,
      enable: mockEnable,
      disable: mockDisable,
      setText: vi.fn(),
      set isVisible(value: boolean) {},
      set isEnabled(value: boolean) {},
      onClick: vi.fn((callback) => {
        (mainButton as unknown as { _callback?: () => void })._callback = callback;
      }),
    },

    retrieveLaunchParams: vi.fn(() => ({
      ...launchParams,
      initDataRaw: JSON.stringify(launchParams),
    })),

    useLaunchParams: () => ({
      ...launchParams,
      initDataRaw: JSON.stringify(launchParams),
      startParam: launchParams.start_param || '',
    }),

    useTelegramUser: () => launchParams.user || null,

    useInitials: () => {
      const user = launchParams.user;
      if (!user) return '';
      return `${user.first_name.charAt(0)}${user.last_name?.charAt(0) || ''}`;
    },

    useThemeParams: () => ({
      backgroundColor: '#ffffff',
      textColor: '#000000',
      hintColor: '#999999',
      linkColor: '#5B5FC7',
      buttonColor: '#5B5FC7',
      buttonTextColor: '#ffffff',
    }),

    useBackButton: () => ({
      show: mockShow,
      hide: mockHide,
      enable: mockEnable,
      disable: mockDisable,
      mount: mockMount,
      unmount: mockUnmount,
      onClick: vi.fn(),
    }),

    useMainButton: () => ({
      show: mockShow,
      hide: mockHide,
      enable: mockEnable,
      disable: mockDisable,
      setText: vi.fn(),
      mount: mockMount,
      unmount: mockUnmount,
      onClick: vi.fn(),
    }),
  }));

  // Return helpers for interacting with mocks in tests
  return {
    backButton: {
      click: () => {
        const cb = (backButton as unknown as { _callback?: () => void })._callback;
        if (cb) cb();
      },
    },
    mainButton: {
      click: () => {
        const cb = (mainButton as unknown as { _callback?: () => void })._callback;
        if (cb) cb();
      },
    },
    getLaunchParams: () => launchParams,
    setLaunchParams: (newParams: Partial<LaunchParams>) => {
      Object.assign(launchParams, newParams);
    },
  };
}

/**
 * Window.Telegram.WebApp mock for legacy SDK usage
 */
export function mockWindowTelegramWebApp(
  launchParams: LaunchParams = defaultLaunchParams
) {
  const openTelegramLink = vi.fn();
  const openLink = vi.fn();
  const close = vi.fn();
  const ready = vi.fn();
  const expand = vi.fn();
  const showPopup = vi.fn();
  const showAlert = vi.fn();
  const showConfirm = vi.fn();
  const showScanQrPopup = vi.fn();
  const readTextFromClipboard = vi.fn().mockResolvedValue('');
  const writeTextToClipboard = vi.fn().mockResolvedValue(undefined);
  const setHeaderColor = vi.fn();
  const setBackgroundColor = vi.fn();
  const setBottomBarColor = vi.fn();
  const enableClosingConfirmation = vi.fn();
  const disableClosingConfirmation = vi.fn();
  const enableVerticalSwipes = vi.fn();
  const disableVerticalSwipes = vi.fn();
  const switchInlineQuery = vi.fn();
  const setEmojiStatus = vi.fn();

  const webAppMock = {
    initData: JSON.stringify(launchParams),
    initDataUnsafe: launchParams,
    version: '8.0',
    platform: 'ios',
    colorScheme: 'light' as const,
    themeParams: {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#5B5FC7',
      button_color: '#5B5FC7',
      button_text_color: '#ffffff',
      secondary_bg_color: '#f5f5f5',
    },
    isExpanded: true,
    viewportHeight: 800,
    viewportStableHeight: 800,
    headerColor: '#ffffff',
    backgroundColor: '#ffffff',
    bottomBarColor: '#ffffff',
    isClosingConfirmationEnabled: false,
    isVerticalSwipesEnabled: true,
    isActive: false,
    isFullscreen: false,
    isOrientationLocked: false,
    safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },

    BackButton: {
      isVisible: false,
      show: vi.fn(() => { webAppMock.BackButton.isVisible = true; }),
      hide: vi.fn(() => { webAppMock.BackButton.isVisible = false; }),
      onClick: vi.fn((cb: () => void) => {
        webAppMock.BackButton._callbacks = webAppMock.BackButton._callbacks || [];
        webAppMock.BackButton._callbacks.push(cb);
      }),
      offClick: vi.fn(),
      _callbacks: [] as (() => void)[],
    },

    MainButton: {
      text: 'CONTINUE',
      color: '#5B5FC7',
      textColor: '#ffffff',
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      setText: vi.fn((text: string) => { webAppMock.MainButton.text = text; }),
      show: vi.fn(() => { webAppMock.MainButton.isVisible = true; }),
      hide: vi.fn(() => { webAppMock.MainButton.isVisible = false; }),
      enable: vi.fn(() => { webAppMock.MainButton.isActive = true; }),
      disable: vi.fn(() => { webAppMock.MainButton.isActive = false; }),
      showProgress: vi.fn(() => { webAppMock.MainButton.isProgressVisible = true; }),
      hideProgress: vi.fn(() => { webAppMock.MainButton.isProgressVisible = false; }),
      onClick: vi.fn((cb: () => void) => {
        webAppMock.MainButton._callbacks = webAppMock.MainButton._callbacks || [];
        webAppMock.MainButton._callbacks.push(cb);
      }),
      offClick: vi.fn(),
      _callbacks: [] as (() => void)[],
    },

    SecondaryButton: {
      text: 'CANCEL',
      color: '#f5f5f5',
      textColor: '#000000',
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      position: 'left' as const,
      show: vi.fn(),
      hide: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      showProgress: vi.fn(),
      hideProgress: vi.fn(),
      setText: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn(),
    },

    SettingsButton: {
      isVisible: false,
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn(),
    },

    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },

    CloudStorage: {
      setItem: vi.fn().mockResolvedValue(undefined),
      getItem: vi.fn().mockResolvedValue(''),
      getItems: vi.fn().mockResolvedValue([]),
      removeItem: vi.fn().mockResolvedValue(undefined),
      removeItems: vi.fn().mockResolvedValue(undefined),
      getKeys: vi.fn().mockResolvedValue([]),
    },

    BiometricManager: {
      isInited: true,
      isBiometricAvailable: false,
      biometricType: 'unknown' as const,
      isAccessRequested: false,
      isAccessGranted: false,
      token: '',
      deviceId: '',
      init: vi.fn().mockResolvedValue(undefined),
      requestAccess: vi.fn().mockResolvedValue({ isGranted: false }),
      authenticate: vi.fn().mockResolvedValue({ isAuthenticated: false }),
      updateToken: vi.fn().mockResolvedValue({ isUpdated: false }),
    },

    openTelegramLink,
    openLink,
    close,
    ready,
    expand,
    showPopup,
    showAlert,
    showConfirm,
    showScanQrPopup,
    readTextFromClipboard,
    writeTextToClipboard,
    setHeaderColor,
    setBackgroundColor,
    setBottomBarColor,
    enableClosingConfirmation,
    disableClosingConfirmation,
    enableVerticalSwipes,
    disableVerticalSwipes,
    switchInlineQuery,
    setEmojiStatus,

    // Event handling
    onEvent: vi.fn((event: string, callback: () => void) => {
      webAppMock._eventHandlers = webAppMock._eventHandlers || {};
      webAppMock._eventHandlers[event] = webAppMock._eventHandlers[event] || [];
      webAppMock._eventHandlers[event].push(callback);
    }),
    offEvent: vi.fn(),
    _eventHandlers: {} as Record<string, (() => void)[]>,
  };

  // Set up global window.Telegram
  Object.defineProperty(global, 'window', {
    value: {
      Telegram: {
        WebApp: webAppMock,
      },
    },
    writable: true,
    configurable: true,
  });

  return webAppMock;
}

/**
 * Trigger a viewport change event in tests
 */
export function triggerViewportChange(height: number, stableHeight?: number) {
  const webApp = (global as unknown as { window: { Telegram: { WebApp: Record<string, unknown> } } }).window.Telegram.WebApp;
  webApp.viewportHeight = height;
  webApp.viewportStableHeight = stableHeight ?? height;

  const handlers = (webApp._eventHandlers as Record<string, (() => void)[]> | undefined)?.['viewportChanged'];
  if (handlers) {
    handlers.forEach((cb) => cb());
  }
}

/**
 * Trigger theme change event in tests
 */
export function triggerThemeChange(colorScheme: 'light' | 'dark') {
  const webApp = (global as unknown as { window: { Telegram: { WebApp: Record<string, unknown> } } }).window.Telegram.WebApp;
  webApp.colorScheme = colorScheme;
  const themeParams = webApp.themeParams as Record<string, string> | undefined;
  if (themeParams) {
    themeParams.bg_color = colorScheme === 'dark' ? '#1a1a1a' : '#ffffff';
  }

  const handlers = webApp._eventHandlers?.['themeChanged'];
  if (handlers) {
    handlers.forEach((cb) => cb());
  }
}

/**
 * Click the back button in tests
 */
export function clickBackButton() {
  const webApp = (global as unknown as { window: { Telegram: { WebApp: Record<string, unknown> } } }).window.Telegram.WebApp;
  const backButton = webApp.BackButton as { _callbacks?: (() => void)[]; isVisible: boolean };
  if (!backButton.isVisible) {
    throw new Error('BackButton is not visible');
  }
  backButton._callbacks?.forEach((cb) => cb());
}

/**
 * Click the main button in tests
 */
export function clickMainButton() {
  const webApp = (global as unknown as { window: { Telegram: { WebApp: Record<string, unknown> } } }).window.Telegram.WebApp;
  const mainButton = webApp.MainButton as { _callbacks?: (() => void)[]; isVisible: boolean; isActive: boolean };
  if (!mainButton.isVisible) {
    throw new Error('MainButton is not visible');
  }
  if (!mainButton.isActive) {
    throw new Error('MainButton is not active');
  }
  mainButton._callbacks?.forEach((cb) => cb());
}

/**
 * Test wrapper that combines all Telegram WebApp mocks
 */
export function setupTelegramWebAppTest(launchParams?: Partial<LaunchParams>) {
  const fullParams = { ...defaultLaunchParams, ...launchParams };
  const sdkMocks = mockTelegramWebApp(fullParams);
  const windowMock = mockWindowTelegramWebApp(fullParams);

  return {
    ...sdkMocks,
    windowMock,
    triggerViewportChange,
    triggerThemeChange,
    clickBackButton,
    clickMainButton,
  };
}
