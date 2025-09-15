import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make vi available globally
global.vi = vi;

// Mock Tauri API for tests
global.__TAURI__ = {
  invoke: async (cmd, payload) => {
    // Mock implementations for different commands
    switch (cmd) {
      case 'make_http_request':
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ test: 'response' })
        };
      case 'resolve_dns':
        return [{
          hostname: payload.hostname || 'example.com',
          ip_addresses: ['127.0.0.1'],
          record_type: 'A',
          ttl: 300
        }];
      default:
        return {};
    }
  }
};

// Mock AudioContext for audio tests
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createAnalyser: vi.fn(),
    createMediaElementSource: vi.fn(),
    state: 'running',
    close: vi.fn(),
    resume: vi.fn()
  }))
});

// Mock webkitAudioContext for Safari compatibility
Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext
});
