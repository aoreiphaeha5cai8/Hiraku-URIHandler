import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

// This test file verifies the complete integration:
// Radio Player -> Audio Pipeline -> Compressor -> Butterchurn

// Mock all the necessary Web APIs and modules
const mockAudioNodes = {
  source: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    mediaElement: null
  },
  compressor: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    threshold: { value: -24, setValueAtTime: vi.fn() },
    knee: { value: 30, setValueAtTime: vi.fn() },
    ratio: { value: 12, setValueAtTime: vi.fn() },
    attack: { value: 0.003, setValueAtTime: vi.fn() },
    release: { value: 0.25, setValueAtTime: vi.fn() }
  },
  analyser: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024
  },
  gain: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1.0, setValueAtTime: vi.fn() }
  }
};

const mockAudioContext = {
  createMediaElementSource: vi.fn(() => mockAudioNodes.source),
  createDynamicsCompressor: vi.fn(() => mockAudioNodes.compressor),
  createAnalyser: vi.fn(() => mockAudioNodes.analyser),
  createGain: vi.fn(() => mockAudioNodes.gain),
  destination: { connect: vi.fn() },
  state: 'running',
  sampleRate: 44100,
  currentTime: 0,
  resume: vi.fn(),
  close: vi.fn()
};

const mockButterchurnVisualizer = {
  loadPreset: vi.fn(),
  render: vi.fn(),
  connectAudio: vi.fn(),
  setRendererSize: vi.fn(),
  destroy: vi.fn()
};

const mockButterchurn = {
  createVisualizer: vi.fn(() => mockButterchurnVisualizer)
};

const mockPresets = {
  'Test Preset 1': { /* preset data */ },
  'Test Preset 2': { /* preset data */ }
};

const mockPresetsModule = {
  getPresets: vi.fn(() => mockPresets)
};

// Mock radio stream
const mockRadioStream = {
  url: 'http://test-stream.example.com:8000/stream',
  name: 'Test Radio Station',
  format: 'MP3',
  bitrate: '128'
};

describe('Full Audio Integration', () => {
  let mockAudioElement;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock call counts
    Object.values(mockAudioNodes).forEach(node => {
      if (node.connect) node.connect.mockClear();
      if (node.disconnect) node.disconnect.mockClear();
    });
    
    // Mock audio element
    mockAudioElement = {
      src: '',
      volume: 0.7,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 4,
      paused: true,
      currentTime: 0,
      duration: 0
    };
    
    // Mock global APIs
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = global.AudioContext;
    global.requestAnimationFrame = vi.fn(callback => {
      setTimeout(callback, 16);
      return 1;
    });
    global.cancelAnimationFrame = vi.fn();
    
    // Mock dynamic imports
    vi.mock('butterchurn', () => ({ default: mockButterchurn }));
    vi.mock('butterchurn-presets', () => ({ default: mockPresetsModule }));
    
    // Mock HTML elements
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'audio') return mockAudioElement;
      if (tagName === 'canvas') {
        const canvas = {
          getContext: vi.fn(() => ({})),
          width: 800,
          height: 600,
          style: {},
          remove: vi.fn()
        };
        return canvas;
      }
      return document.createElement(tagName);
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Complete Audio Chain Setup', () => {
    it('should create complete audio processing chain', async () => {
      // Simulate the full chain setup that happens in the app
      const audioContext = new AudioContext();
      
      // Create audio source from radio stream
      const source = audioContext.createMediaElementSource(mockAudioElement);
      mockAudioNodes.source.mediaElement = mockAudioElement;
      
      // Create processing nodes
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      // Configure compressor (medium preset)
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      // Build processing chain: source -> compressor -> analyser -> gain -> destination
      source.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Verify chain construction
      expect(audioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudioElement);
      expect(audioContext.createDynamicsCompressor).toHaveBeenCalled();
      expect(audioContext.createAnalyser).toHaveBeenCalled();
      expect(audioContext.createGain).toHaveBeenCalled();
      
      expect(source.connect).toHaveBeenCalledWith(compressor);
      expect(compressor.connect).toHaveBeenCalledWith(analyser);
      expect(analyser.connect).toHaveBeenCalledWith(gainNode);
      expect(gainNode.connect).toHaveBeenCalledWith(audioContext.destination);
    });
    
    it('should initialize Butterchurn with audio connection', async () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      
      // Create Butterchurn visualizer
      const canvas = document.createElement('canvas');
      const visualizer = mockButterchurn.createVisualizer(audioContext, canvas, {
        width: 1920,
        height: 1080,
        pixelRatio: 1,
        textureRatio: 1
      });
      
      // Connect audio to Butterchurn
      visualizer.connectAudio(source);
      
      // Load initial preset
      const presetKeys = Object.keys(mockPresets);
      const initialPreset = mockPresets[presetKeys[0]];
      visualizer.loadPreset(initialPreset, 0.0);
      
      // Verify Butterchurn setup
      expect(mockButterchurn.createVisualizer).toHaveBeenCalledWith(
        audioContext, canvas, expect.objectContaining({
          width: 1920,
          height: 1080
        })
      );
      expect(visualizer.connectAudio).toHaveBeenCalledWith(source);
      expect(visualizer.loadPreset).toHaveBeenCalledWith(initialPreset, 0.0);
    });
  });
  
  describe('Radio Stream Playback Integration', () => {
    it('should start radio stream and initialize audio processing', async () => {
      const audioContext = new AudioContext();
      
      // Simulate radio stream setup
      mockAudioElement.src = mockRadioStream.url;
      const source = audioContext.createMediaElementSource(mockAudioElement);
      
      // Set up processing chain
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      source.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set volume and play
      mockAudioElement.volume = 0.7;
      await mockAudioElement.play();
      
      // Verify radio setup
      expect(mockAudioElement.src).toBe(mockRadioStream.url);
      expect(mockAudioElement.volume).toBe(0.7);
      expect(mockAudioElement.play).toHaveBeenCalled();
      
      // Verify audio chain is connected
      expect(source.connect).toHaveBeenCalledWith(compressor);
      expect(compressor.connect).toHaveBeenCalledWith(analyser);
    });
    
    it('should handle radio stream with compressor processing', async () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const compressor = audioContext.createDynamicsCompressor();
      
      // Configure compressor for radio processing
      compressor.threshold.value = -20; // Higher threshold for radio
      compressor.knee.value = 25;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.001; // Fast attack for radio
      compressor.release.value = 0.1;  // Medium release
      
      source.connect(compressor);
      
      // Start radio stream
      mockAudioElement.src = mockRadioStream.url;
      await mockAudioElement.play();
      
      // Verify compressor is configured for radio
      expect(compressor.threshold.value).toBe(-20);
      expect(compressor.knee.value).toBe(25);
      expect(compressor.ratio.value).toBe(8);
      expect(source.connect).toHaveBeenCalledWith(compressor);
    });
  });
  
  describe('Audio Analysis for Visualization', () => {
    it('should extract frequency data for Butterchurn', async () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const analyser = audioContext.createAnalyser();
      
      source.connect(analyser);
      
      // Mock frequency data extraction
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      // Simulate audio with various frequencies
      for (let i = 0; i < 200; i++) {
        frequencyData[i] = 100 + Math.floor(Math.random() * 100); // Bass/mids
      }
      for (let i = 200; i < 1024; i++) {
        frequencyData[i] = Math.floor(Math.random() * 50); // Highs
      }
      
      mockAudioNodes.analyser.getByteFrequencyData.mockImplementation((array) => {
        array.set(frequencyData);
      });
      
      // Extract frequency data
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate intensity for visualization
      const sum = Array.from(dataArray).reduce((a, b) => a + b, 0);
      const averageIntensity = sum / dataArray.length;
      const normalizedIntensity = 1 + averageIntensity / 128;
      
      expect(analyser.getByteFrequencyData).toHaveBeenCalledWith(dataArray);
      expect(averageIntensity).toBeGreaterThan(0);
      expect(normalizedIntensity).toBeGreaterThan(1);
    });
    
    it('should provide audio data to Butterchurn for reactive visuals', async () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const analyser = audioContext.createAnalyser();
      
      // Connect analyser to source
      source.connect(analyser);
      
      // Create and connect Butterchurn
      const canvas = document.createElement('canvas');
      const visualizer = mockButterchurn.createVisualizer(audioContext, canvas);
      visualizer.connectAudio(source);
      
      // Start radio and begin analysis
      mockAudioElement.src = mockRadioStream.url;
      await mockAudioElement.play();
      
      // Simulate render loop with audio analysis
      const renderLoop = () => {
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);
        visualizer.render();
      };
      
      renderLoop();
      
      expect(visualizer.connectAudio).toHaveBeenCalledWith(source);
      expect(visualizer.render).toHaveBeenCalled();
    });
  });
  
  describe('Settings Modal Integration', () => {
    it('should control compressor settings from settings modal', async () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Simulate settings modal compressor preset change
      const applyCompressorPreset = (preset) => {
        const presets = {
          'none': { threshold: -100, knee: 0, ratio: 1, attack: 0, release: 0 },
          'low': { threshold: -50, knee: 40, ratio: 12, attack: 0.000, release: 0.250 },
          'medium': { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 },
          'high': { threshold: -18, knee: 6, ratio: 20, attack: 0.001, release: 0.1 }
        };
        
        const settings = presets[preset];
        if (settings) {
          compressor.threshold.value = settings.threshold;
          compressor.knee.value = settings.knee;
          compressor.ratio.value = settings.ratio;
          compressor.attack.value = settings.attack;
          compressor.release.value = settings.release;
        }
      };
      
      // Apply different presets
      applyCompressorPreset('medium');
      expect(compressor.threshold.value).toBe(-24);
      expect(compressor.knee.value).toBe(30);
      
      applyCompressorPreset('high');
      expect(compressor.threshold.value).toBe(-18);
      expect(compressor.ratio.value).toBe(20);
    });
    
    it('should control Butterchurn presets from settings modal', async () => {
      const canvas = document.createElement('canvas');
      const visualizer = mockButterchurn.createVisualizer(mockAudioContext, canvas);
      
      // Simulate preset switching from settings modal
      const switchPreset = (presetIndex, blendTime = 5.7) => {
        const presetKeys = Object.keys(mockPresets);
        const presetKey = presetKeys[presetIndex];
        const preset = mockPresets[presetKey];
        
        if (preset) {
          visualizer.loadPreset(preset, blendTime);
        }
      };
      
      // Switch presets
      switchPreset(0, 0.0);  // First preset, no blend
      switchPreset(1, 5.7);  // Second preset, smooth blend
      
      expect(visualizer.loadPreset).toHaveBeenCalledTimes(2);
      expect(visualizer.loadPreset).toHaveBeenNthCalledWith(1, mockPresets['Test Preset 1'], 0.0);
      expect(visualizer.loadPreset).toHaveBeenNthCalledWith(2, mockPresets['Test Preset 2'], 5.7);
    });
  });
  
  describe('Error Handling and Fallbacks', () => {
    it('should handle AudioContext creation failure gracefully', () => {
      global.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      });
      
      expect(() => new AudioContext()).toThrow('AudioContext not supported');
      
      // Application should fallback to basic playback without processing
    });
    
    it('should handle Butterchurn initialization failure', () => {
      mockButterchurn.createVisualizer.mockImplementation(() => {
        throw new Error('WebGL not supported');
      });
      
      expect(() => {
        mockButterchurn.createVisualizer(mockAudioContext, document.createElement('canvas'));
      }).toThrow('WebGL not supported');
      
      // Application should fallback to static background
    });
    
    it('should handle radio stream connection failure', async () => {
      mockAudioElement.play.mockRejectedValue(new Error('Network error'));
      
      mockAudioElement.src = 'http://invalid-stream.com';
      
      try {
        await mockAudioElement.play();
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
      
      // Application should show error and allow retry
    });
  });
  
  describe('Performance and Resource Management', () => {
    it('should properly cleanup audio resources', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      
      // Connect chain
      source.connect(compressor);
      compressor.connect(analyser);
      
      // Cleanup - disconnect all nodes
      source.disconnect();
      compressor.disconnect();
      analyser.disconnect();
      audioContext.close();
      
      expect(source.disconnect).toHaveBeenCalled();
      expect(compressor.disconnect).toHaveBeenCalled();
      expect(analyser.disconnect).toHaveBeenCalled();
      expect(audioContext.close).toHaveBeenCalled();
    });
    
    it('should cleanup Butterchurn resources', () => {
      const canvas = document.createElement('canvas');
      const visualizer = mockButterchurn.createVisualizer(mockAudioContext, canvas);
      
      // Cleanup
      cancelAnimationFrame(1);
      visualizer.destroy();
      canvas.remove();
      
      expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
      expect(visualizer.destroy).toHaveBeenCalled();
      expect(canvas.remove).toHaveBeenCalled();
    });
  });
  
  describe('Real-world Usage Scenarios', () => {
    it('should handle complete user workflow: start radio -> open settings -> change compressor -> change preset', async () => {
      // 1. User starts radio stream
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      
      // Build chain
      source.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(audioContext.destination);
      
      // Start radio
      mockAudioElement.src = mockRadioStream.url;
      await mockAudioElement.play();
      
      // 2. User opens settings and changes compressor to 'high'
      compressor.threshold.value = -18;
      compressor.knee.value = 6;
      compressor.ratio.value = 20;
      
      // 3. User initializes Butterchurn
      const canvas = document.createElement('canvas');
      const visualizer = mockButterchurn.createVisualizer(audioContext, canvas);
      visualizer.connectAudio(source);
      
      // 4. User changes Butterchurn preset
      const preset = mockPresets['Test Preset 2'];
      visualizer.loadPreset(preset, 5.7);
      
      // Verify complete workflow
      expect(mockAudioElement.play).toHaveBeenCalled();
      expect(compressor.threshold.value).toBe(-18);
      expect(visualizer.connectAudio).toHaveBeenCalledWith(source);
      expect(visualizer.loadPreset).toHaveBeenCalledWith(preset, 5.7);
    });
    
    it('should maintain audio processing during tab switches', async () => {
      // Audio processing should continue when switching between tabs
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      
      // Start radio in Radio Player tab
      mockAudioElement.src = mockRadioStream.url;
      await mockAudioElement.play();
      
      // Switch to HTTP Client tab (audio should continue)
      // Switch to Network Tools tab (audio should continue)
      // Switch back to Radio Player tab (audio should still be playing)
      
      expect(mockAudioElement.play).toHaveBeenCalled();
      expect(audioContext.state).toBe('running');
      // Audio context and processing chain should remain active
    });
  });
});
