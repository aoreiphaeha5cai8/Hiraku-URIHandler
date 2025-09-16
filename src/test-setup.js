import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make vi available globally
global.vi = vi;

// Test utilities
global.createMockAudioElement = () => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  paused: true,
  readyState: 4,
  error: null
});

global.createMockCanvas = () => {
  const canvas = {
    width: 800,
    height: 600,
    style: {},
    getContext: vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn()
    })),
    remove: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  return canvas;
};

// Test helper for simulating audio data
global.createMockFrequencyData = (size = 1024) => {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    // Simulate realistic frequency data with more energy in lower frequencies
    if (i < size * 0.1) {
      data[i] = 150 + Math.floor(Math.random() * 100); // Bass
    } else if (i < size * 0.3) {
      data[i] = 100 + Math.floor(Math.random() * 80);  // Low mids
    } else if (i < size * 0.6) {
      data[i] = 50 + Math.floor(Math.random() * 60);   // High mids
    } else {
      data[i] = Math.floor(Math.random() * 40);        // Highs
    }
  }
  return data;
};

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

// Enhanced Mock AudioContext for comprehensive audio tests
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createAnalyser: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024
    })),
    createMediaElementSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      mediaElement: null
    })),
    createDynamicsCompressor: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      threshold: { value: -24, setValueAtTime: vi.fn() },
      knee: { value: 30, setValueAtTime: vi.fn() },
      ratio: { value: 12, setValueAtTime: vi.fn() },
      attack: { value: 0.003, setValueAtTime: vi.fn() },
      release: { value: 0.25, setValueAtTime: vi.fn() },
      reduction: 0
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1.0, setValueAtTime: vi.fn() }
    })),
    destination: { connect: vi.fn() },
    state: 'running',
    sampleRate: 44100,
    currentTime: 0,
    close: vi.fn(),
    resume: vi.fn()
  }))
});

// Mock webkitAudioContext for Safari compatibility
Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext
});

// Mock Canvas and WebGL for Butterchurn tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn((type) => {
    if (type === 'webgl' || type === 'webgl2') {
      return {
        clearColor: vi.fn(),
        clear: vi.fn(),
        drawArrays: vi.fn(),
        useProgram: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getAttribLocation: vi.fn(),
        getUniformLocation: vi.fn()
      };
    }
    return {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn()
    };
  })
});

// Mock requestAnimationFrame and related functions
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((callback) => {
    setTimeout(callback, 16); // ~60fps
    return 1;
  })
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn()
});

// Mock Butterchurn modules (will be overridden by individual tests as needed)
vi.mock('butterchurn', () => ({
  default: {
    createVisualizer: vi.fn(() => ({
      loadPreset: vi.fn(),
      render: vi.fn(),
      connectAudio: vi.fn(),
      setRendererSize: vi.fn(),
      destroy: vi.fn()
    }))
  }
}));

vi.mock('butterchurn-presets', () => ({
  default: {
    getPresets: vi.fn(() => ({
      'Test Preset': { /* mock preset data */ }
    }))
  }
}));

// Mock NexusUI for AudioSettings tests
vi.mock('nexusui', () => ({
  default: {
    Dial: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      colorize: vi.fn(),
      resize: vi.fn(),
      value: 0.5,
      destroy: vi.fn()
    }))
  }
}));

// Enhanced console mock to capture test outputs
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// Helper function to restore console for debugging
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Mock HTML5 Audio element
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  volume: 1.0,
  currentTime: 0,
  duration: 0,
  paused: true,
  readyState: 4
}));

// Mock MediaError for audio error testing
global.MediaError = {
  MEDIA_ERR_ABORTED: 1,
  MEDIA_ERR_NETWORK: 2,
  MEDIA_ERR_DECODE: 3,
  MEDIA_ERR_SRC_NOT_SUPPORTED: 4
};
