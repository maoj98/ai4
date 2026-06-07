import { beforeEach, vi } from 'vitest';
import { config } from '@vue/test-utils';

vi.mock('@/utils/storage', () => ({
  loadFromStorage: vi.fn(() => ({ success: false, error: 'Mock storage disabled' })),
  saveToStorage: vi.fn(() => ({ success: true })),
  debouncedSave: vi.fn(),
  clearStorage: vi.fn(() => true),
  exportData: vi.fn(() => '{}'),
  downloadExport: vi.fn(),
  importData: vi.fn(() => ({ success: false, error: 'Mock import disabled' })),
  readFileAsText: vi.fn(() => Promise.resolve('{}')),
  migrateData: vi.fn((data) => data),
  getStorageInfo: vi.fn(() => ({
    available: true,
    usedBytes: 0,
    maxBytes: 4 * 1024 * 1024,
    percentage: 0,
  })),
  getStorageSize: vi.fn(() => 0),
  checkStorageCapacity: vi.fn(() => ({ ok: true, used: 0, max: 4 * 1024 * 1024, percentage: 0 })),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

config.global.stubs = {
  transition: false,
  'transition-group': false,
  teleport: true,
};
