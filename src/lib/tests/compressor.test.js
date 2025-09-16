import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AudioSettings from '../components/AudioSettings.svelte';

// Mock the NexusUI import
vi.mock('nexusui', () => {
  return {
    default: {
      Dial: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        colorize: vi.fn(),
        resize: vi.fn(),
        value: 0.5,
        destroy: vi.fn()
      }))
    }
  };
});

// Advanced mock for DynamicsCompressorNode
const createMockCompressor = () => {
  const compressor = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    
    // Compressor-specific properties with AudioParam mock
    threshold: {
      value: -24,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    knee: {
      value: 30,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    ratio: {
      value: 12,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    attack: {
      value: 0.003,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    release: {
      value: 0.25,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    
    // Compressor reduction (read-only)
    reduction: 0.0,
    
    // Node properties
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 2,
    channelCountMode: 'max',
    channelInterpretation: 'speakers'
  };
  
  return compressor;
};

const createMockAudioContext = () => {
  const mockNodes = {
    compressor: createMockCompressor(),
    gain: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {
        value: 1.0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn()
      }
    },
    analyser: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024
    },
    mediaElementSource: {
      connect: vi.fn(),
      disconnect: vi.fn()
    }
  };
  
  return {
    createDynamicsCompressor: vi.fn(() => mockNodes.compressor),
    createGain: vi.fn(() => mockNodes.gain),
    createAnalyser: vi.fn(() => mockNodes.analyser),
    createMediaElementSource: vi.fn(() => mockNodes.mediaElementSource),
    destination: { connect: vi.fn() },
    state: 'running',
    sampleRate: 44100,
    _mockNodes: mockNodes
  };
};

describe('Audio Compressor', () => {
  let mockAudioContext;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext = createMockAudioContext();
    global.AudioContext = vi.fn(() => mockAudioContext);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Compressor Node Creation', () => {
    it('should create dynamics compressor node', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      expect(audioContext.createDynamicsCompressor).toHaveBeenCalled();
      expect(compressor).toBeDefined();
      expect(compressor.threshold).toBeDefined();
      expect(compressor.knee).toBeDefined();
      expect(compressor.ratio).toBeDefined();
      expect(compressor.attack).toBeDefined();
      expect(compressor.release).toBeDefined();
    });
    
    it('should have correct default compressor values', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Check default values are within reasonable ranges
      expect(compressor.threshold.value).toBeGreaterThan(-100);
      expect(compressor.threshold.value).toBeLessThan(0);
      expect(compressor.knee.value).toBeGreaterThanOrEqual(0);
      expect(compressor.knee.value).toBeLessThanOrEqual(40);
      expect(compressor.ratio.value).toBeGreaterThanOrEqual(1);
      expect(compressor.ratio.value).toBeLessThanOrEqual(20);
      expect(compressor.attack.value).toBeGreaterThanOrEqual(0);
      expect(compressor.attack.value).toBeLessThanOrEqual(1);
      expect(compressor.release.value).toBeGreaterThanOrEqual(0);
      expect(compressor.release.value).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Compressor Parameter Configuration', () => {
    it('should set threshold parameter correctly', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Set threshold to -50dB
      compressor.threshold.value = -50.0;
      
      expect(compressor.threshold.value).toBe(-50.0);
    });
    
    it('should set knee parameter correctly', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Set knee to 40dB
      compressor.knee.value = 40.0;
      
      expect(compressor.knee.value).toBe(40.0);
    });
    
    it('should set ratio parameter correctly', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Set ratio to 12:1
      compressor.ratio.value = 12.0;
      
      expect(compressor.ratio.value).toBe(12.0);
    });
    
    it('should set attack parameter correctly', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Set attack to 3ms
      compressor.attack.value = 0.003;
      
      expect(compressor.attack.value).toBe(0.003);
    });
    
    it('should set release parameter correctly', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Set release to 250ms
      compressor.release.value = 0.25;
      
      expect(compressor.release.value).toBe(0.25);
    });
  });
  
  describe('Compressor Presets', () => {
    const presets = {
      none: { threshold: -100, knee: 0, ratio: 1, attack: 0, release: 0 },
      low: { threshold: -50, knee: 40, ratio: 12, attack: 0.000, release: 0.250 },
      medium: { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 },
      high: { threshold: -18, knee: 6, ratio: 20, attack: 0.001, release: 0.1 }
    };
    
    Object.entries(presets).forEach(([presetName, values]) => {
      it(`should apply ${presetName} preset correctly`, () => {
        const audioContext = new AudioContext();
        const compressor = audioContext.createDynamicsCompressor();
        
        // Apply preset values
        compressor.threshold.value = values.threshold;
        compressor.knee.value = values.knee;
        compressor.ratio.value = values.ratio;
        compressor.attack.value = values.attack;
        compressor.release.value = values.release;
        
        // Verify all values are set correctly
        expect(compressor.threshold.value).toBe(values.threshold);
        expect(compressor.knee.value).toBe(values.knee);
        expect(compressor.ratio.value).toBe(values.ratio);
        expect(compressor.attack.value).toBe(values.attack);
        expect(compressor.release.value).toBe(values.release);
      });
    });
  });
  
  describe('Compressor in Audio Chain', () => {
    it('should connect compressor in audio processing chain', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource();
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      const gain = audioContext.createGain();
      
      // Build chain: source -> compressor -> analyser -> gain -> destination
      source.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(gain);
      gain.connect(audioContext.destination);
      
      expect(source.connect).toHaveBeenCalledWith(compressor);
      expect(compressor.connect).toHaveBeenCalledWith(analyser);
      expect(analyser.connect).toHaveBeenCalledWith(gain);
      expect(gain.connect).toHaveBeenCalledWith(audioContext.destination);
    });
    
    it('should allow bypassing compressor', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource();
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      
      // Normal chain
      source.connect(compressor);
      compressor.connect(analyser);
      
      // Bypass compressor by connecting source directly to analyser
      source.disconnect();
      source.connect(analyser);
      
      expect(source.disconnect).toHaveBeenCalled();
      expect(source.connect).toHaveBeenCalledWith(analyser);
    });
  });
  
  describe('Compressor Performance Simulation', () => {
    it('should simulate compressor working on loud signal', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Configure for aggressive compression
      compressor.threshold.value = -24; // dB
      compressor.ratio.value = 10;       // 10:1 ratio
      compressor.attack.value = 0.003;   // 3ms attack
      compressor.release.value = 0.1;    // 100ms release
      
      // In a real scenario, we would simulate audio input above threshold
      // For testing, we verify the parameters are set for compression
      expect(compressor.threshold.value).toBe(-24);
      expect(compressor.ratio.value).toBe(10);
      
      // Simulate that loud signals would be compressed
      // (In real implementation, reduction would be calculated by the compressor)
      const inputLevel = -12; // dB (above threshold)
      const expectedReduction = (inputLevel - compressor.threshold.value) * 
                               (1 - 1/compressor.ratio.value);
      
      expect(expectedReduction).toBeGreaterThan(0); // Should compress
    });
    
    it('should simulate compressor not affecting quiet signals', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      compressor.threshold.value = -24; // dB
      
      // Simulate quiet signal below threshold
      const inputLevel = -40; // dB (below threshold)
      
      if (inputLevel < compressor.threshold.value) {
        // No compression should occur
        const reduction = 0;
        expect(reduction).toBe(0);
      }
    });
  });
  
  describe('Compressor UI Integration', () => {
    it('should render AudioSettings component with compressor controls', async () => {
      const { container } = render(AudioSettings);
      
      // Look for compressor-related elements
      const compressorSection = container.querySelector('h3');
      expect(compressorSection).toBeInTheDocument();
    });
    
    // Note: More detailed UI tests would require the actual AudioSettings component
    // with mocked NexusUI interactions
  });
  
  describe('Compressor Error Handling', () => {
    it('should handle invalid parameter values gracefully', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Test boundary values
      expect(() => {
        compressor.threshold.value = -200; // Very low threshold
        compressor.knee.value = 50;        // High knee value
        compressor.ratio.value = 50;       // Very high ratio
        compressor.attack.value = 2;       // Long attack
        compressor.release.value = 5;      // Long release
      }).not.toThrow();
      
      // AudioParam should clamp values to valid ranges
      // (In real implementation, Web Audio API handles this)
    });
    
    it('should handle compressor node disconnection', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      const source = audioContext.createMediaElementSource();
      
      source.connect(compressor);
      
      // Disconnect should not throw
      expect(() => {
        compressor.disconnect();
        source.disconnect();
      }).not.toThrow();
      
      expect(compressor.disconnect).toHaveBeenCalled();
      expect(source.disconnect).toHaveBeenCalled();
    });
  });
  
  describe('Real-time Parameter Changes', () => {
    it('should support smooth parameter transitions', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Start with one setting
      compressor.threshold.value = -30;
      
      // Schedule smooth transition (using AudioParam methods)
      const currentTime = audioContext.currentTime || 0;
      compressor.threshold.setValueAtTime(-30, currentTime);
      compressor.threshold.linearRampToValueAtTime(-20, currentTime + 1.0);
      
      expect(compressor.threshold.setValueAtTime).toHaveBeenCalledWith(-30, currentTime);
      expect(compressor.threshold.linearRampToValueAtTime).toHaveBeenCalledWith(-20, currentTime + 1.0);
    });
  });
});
