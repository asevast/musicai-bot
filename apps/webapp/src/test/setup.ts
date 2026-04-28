import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { useWizardStore } from '../store/wizard.store';
import { useTracksStore } from '../store/tracks.store';

// Mock Telegram SDK (hoisted - must use vi.fn() directly in factory)
vi.mock('@telegram-apps/sdk-react', () => {
  const mockMount = vi.fn().mockResolvedValue(undefined);
  const mockUser = { id: 123456, firstName: 'Test', lastName: 'User', username: 'testuser' };
  const mockLaunchParams = {
    initData: { user: mockUser },
    initDataRaw: 'test-init-data',
    startParam: '',
  };

  return {
    init: vi.fn().mockResolvedValue(undefined),
    miniApp: { mount: mockMount, unmount: mockMount },
    themeParams: { mount: mockMount, unmount: mockMount },
    viewport: { mount: mockMount, unmount: mockMount, expand: vi.fn() },
    backButton: { mount: mockMount, unmount: mockMount },
    retrieveLaunchParams: vi.fn(() => mockLaunchParams),
    useLaunchParams: () => mockLaunchParams,
    useTelegramUser: () => mockUser,
    useInitials: () => 'TU',
    useThemeParams: () => ({}),
    useBackButton: () => ({
      mount: mockMount,
      unmount: mockMount,
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn(),
    }),
    useMainButton: () => ({
      mount: mockMount,
      unmount: mockMount,
      setText: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn(),
    }),
  };
});

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    once: vi.fn(),
    disconnected: false,
  }),
}));

// Mock ky
vi.mock('ky', () => ({
  default: {
    create: () => ({
      get: vi.fn((url: string) => {
        if (url.includes('profile')) {
          return Promise.resolve({
            id: 'user-1',
            username: 'testuser',
            firstName: 'Test',
            credits: 80,
            subscriptionTier: 'free',
            subscriptionExpiresAt: null,
          });
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      }),
      post: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    }),
  },
}));

// Mock api/client with proper return values
const mockProfile = {
  id: 'user-1',
  username: 'testuser',
  firstName: 'Test',
  credits: 80,
  subscriptionTier: 'free',
  subscriptionExpiresAt: null,
};

const mockUserResponse = { id: 'user-1' };
const mockHistory = { transactions: [], total: 0 };
const mockTracks = { tracks: [], total: 0 };

const createMockClient = () => ({
  get: vi.fn((url: string) => {
    if (url.includes('/users/telegram/')) {
      return { json: () => Promise.resolve(mockUserResponse) };
    }
    if (url.includes('/profile')) {
      return { json: () => Promise.resolve(mockProfile) };
    }
    if (url.includes('/history')) {
      return { json: () => Promise.resolve(mockHistory) };
    }
    if (url.includes('/user/') || url.includes('/public')) {
      return { json: () => Promise.resolve(mockTracks) };
    }
    return { json: () => Promise.resolve([]) };
  }),
  post: vi.fn(() => ({ json: () => Promise.resolve({}) })),
});

vi.mock('../api/client', () => ({
  apiClient: createMockClient(),
}));

// Clean up stores after each test
afterEach(() => {
  useWizardStore.getState().resetWizard();
  useTracksStore.getState().setTracks([]);
  useTracksStore.getState().setCurrentTrack(null);
  useTracksStore.getState().setLoading(false);
  vi.clearAllMocks();
});
