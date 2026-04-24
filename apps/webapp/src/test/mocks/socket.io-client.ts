import { vi } from 'vitest';

export const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  once: vi.fn(),
  disconnected: false,
};

export const io = vi.fn(() => mockSocket);
