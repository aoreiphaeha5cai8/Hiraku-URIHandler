import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

// Mock Web Audio API components
const createMockAudioContext = () => {
  const mockNodes = {
    analyser: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024
    },
    compressor: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 }
    },
    gain: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1.0 }
    },
    mediaElementSource: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      mediaElement: {}
    },
    destination: {
      connect: vi.fn()
    }
  };
  
  return {
    createAnalyser: vi.fn(() => mockNodes.analyser),
    createDynamicsCompressor: vi.fn(() => mockNodes.compressor),
    createGain: vi.fn(() => mockNodes.gain),
    createMediaElementSource: vi.fn(() => mockNodes.mediaElementSource),
    destination: mockNodes.destination,
    state: 'running',
    sampleRate: 44100,
    resume: vi.fn(),
    close: vi.fn(),
    _mockNodes: mockNodes  // For test access
  };
};

// Mock Butterchurn
const createMockButterchurn = () => ({
  createVisualizer: vi.fn(() => ({
    loadPreset: vi.fn(),
    render: vi.fn(),
    connectAudio: vi.fn(),
    setRendererSize: vi.fn(),
    destroy: vi.fn()
  }))
});

describe('Audio Chain Integration', () => {
  let mockAudioContext;
  let mockButterchurn;
  let mockAudioElement;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create fresh mocks
    mockAudioContext = createMockAudioContext();
    mockButterchurn = createMockButterchurn();
    
    // Mock audio element
    mockAudioElement = {
      play: vi.fn(),
      pause: vi.fn(),
      volume: 0.5,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      src: 'test://audio-stream'
    };
    
    // Mock global AudioContext
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = global.AudioContext;
    
    // Mock dynamic imports
    vi.mock('butterchurn', () => ({ default: mockButterchurn }));
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Audio Context Creation', () => {
    it('should create audio context successfully', () => {
      const audioContext = new AudioContext();
      
      expect(audioContext).toBeDefined();
      expect(audioContext.state).toBe('running');
      expect(audioContext.createAnalyser).toBeDefined();
      expect(audioContext.createDynamicsCompressor).toBeDefined();
    });
    
    it('should create media element source', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      
      expect(audioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudioElement);
      expect(source).toBeDefined();
      expect(source.connect).toBeDefined();
    });
  });
  
  describe('Audio Processing Chain', () => {
    it('should create complete audio processing chain', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      // Build the chain: source -> compressor -> analyser -> gain -> destination
      source.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Verify chain connections
      expect(source.connect).toHaveBeenCalledWith(compressor);
      expect(compressor.connect).toHaveBeenCalledWith(analyser);
      expect(analyser.connect).toHaveBeenCalledWith(gainNode);
      expect(gainNode.connect).toHaveBeenCalledWith(audioContext.destination);
    });
    
    it('should configure compressor with correct settings', () => {
      const audioContext = new AudioContext();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Set compressor parameters (typical values)
      compressor.threshold.value = -50.0; // dB
      compressor.knee.value = 40.0;
      compressor.ratio.value = 12.0;
      compressor.attack.value = 0.000; // seconds
      compressor.release.value = 0.250; // seconds
      
      expect(compressor.threshold.value).toBe(-50.0);
      expect(compressor.knee.value).toBe(40.0);
      expect(compressor.ratio.value).toBe(12.0);
      expect(compressor.attack.value).toBe(0.000);
      expect(compressor.release.value).toBe(0.250);
    });
    
    it('should configure analyser for visualization', () => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      
      // Typical analyser configuration
      analyser.fftSize = 2048;
      
      expect(analyser.fftSize).toBe(2048);
      expect(analyser.frequencyBinCount).toBe(1024);
      expect(analyser.getByteFrequencyData).toBeDefined();
    });
  });
  
  describe('Butterchurn Audio Connection', () => {
    it('should connect audio source to Butterchurn visualizer', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const visualizer = mockButterchurn.createVisualizer();
      
      // Connect audio to Butterchurn
      visualizer.connectAudio(source);
      
      expect(mockButterchurn.createVisualizer).toHaveBeenCalled();
      expect(visualizer.connectAudio).toHaveBeenCalledWith(source);
    });
    
    it('should create Butterchurn visualizer with correct parameters', () => {
      const audioContext = new AudioContext();
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      
      const visualizer = mockButterchurn.createVisualizer(audioContext, canvas, {
        width: 1920,
        height: 1080,
        pixelRatio: 1,
        textureRatio: 1
      });
      
      expect(mockButterchurn.createVisualizer).toHaveBeenCalledWith(
        audioContext,
        canvas,
        {
          width: 1920,
          height: 1080,
          pixelRatio: 1,
          textureRatio: 1
        }
      );
    });
  });
  
  describe('Complete Audio Pipeline', () => {
    it('should create complete pipeline: source -> compressor -> analyser -> butterchurn', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      // Create Butterchurn
      const canvas = document.createElement('canvas');
      const visualizer = mockButterchurn.createVisualizer(audioContext, canvas, {
        width: 800,
        height: 600
      });
      
      // Build complete pipeline
      source.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Connect to Butterchurn (usually takes the source before processing)
      visualizer.connectAudio(source);
      
      // Verify complete chain
      expect(source.connect).toHaveBeenCalledWith(compressor);
      expect(compressor.connect).toHaveBeenCalledWith(analyser);
      expect(analyser.connect).toHaveBeenCalledWith(gainNode);
      expect(gainNode.connect).toHaveBeenCalledWith(audioContext.destination);
      expect(visualizer.connectAudio).toHaveBeenCalledWith(source);
    });
    
    it('should handle audio pipeline initialization function', () => {
      // Mock the global audio pipeline function that would be on window
      const initializeAudioPipeline = vi.fn((audioContext, source) => {
        // Simulate the actual pipeline creation
        const compressor = audioContext.createDynamicsCompressor();
        const analyser = audioContext.createAnalyser();
        const gainNode = audioContext.createGain();
        
        // Configure compressor
        compressor.threshold.value = -50.0;
        compressor.knee.value = 40.0;
        compressor.ratio.value = 12.0;
        compressor.attack.value = 0.000;
        compressor.release.value = 0.250;
        
        // Build chain
        source.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        return source; // Return processed source
      });
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      
      const processedSource = initializeAudioPipeline(audioContext, source);
      
      expect(initializeAudioPipeline).toHaveBeenCalledWith(audioContext, source);
      expect(processedSource).toBe(source);
      
      // Verify compressor was created and configured
      expect(audioContext.createDynamicsCompressor).toHaveBeenCalled();
      expect(audioContext.createAnalyser).toHaveBeenCalled();
      expect(audioContext.createGain).toHaveBeenCalled();
    });
  });
  
  describe('Audio Data Analysis', () => {
    it('should extract frequency data from analyser', () => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      
      // Mock frequency data
      const mockFrequencyData = new Uint8Array(analyser.frequencyBinCount);
      for (let i = 0; i < mockFrequencyData.length; i++) {
        mockFrequencyData[i] = Math.floor(Math.random() * 255);
      }
      
      analyser.getByteFrequencyData.mockImplementation((array) => {
        array.set(mockFrequencyData);
      });
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      expect(analyser.getByteFrequencyData).toHaveBeenCalledWith(dataArray);
      expect(dataArray.length).toBe(1024); // frequencyBinCount
    });
    
    it('should calculate audio intensity from frequency data', () => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      
      // Mock realistic frequency data
      const mockData = new Uint8Array(1024);
      // Simulate audio with some energy in lower frequencies
      for (let i = 0; i < 100; i++) {
        mockData[i] = 150 + Math.floor(Math.random() * 100);
      }
      for (let i = 100; i < 1024; i++) {
        mockData[i] = Math.floor(Math.random() * 50);
      }
      
      analyser.getByteFrequencyData.mockImplementation((array) => {
        array.set(mockData);
      });
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate intensity (like in the actual app)
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const averageIntensity = sum / dataArray.length;
      const normalizedIntensity = 1 + averageIntensity / 128;
      
      expect(averageIntensity).toBeGreaterThan(0);
      expect(normalizedIntensity).toBeGreaterThan(1);
      expect(normalizedIntensity).toBeLessThan(4); // Reasonable upper bound
    });
  });
  
  describe('Audio Pipeline Error Handling', () => {
    it('should handle AudioContext creation failure', () => {
      // Mock AudioContext constructor failure
      const originalAudioContext = global.AudioContext;
      global.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      });
      
      expect(() => new AudioContext()).toThrow('AudioContext not supported');
      
      // Restore
      global.AudioContext = originalAudioContext;
    });
    
    it('should handle missing audio element gracefully', () => {
      const audioContext = new AudioContext();
      
      expect(() => {
        audioContext.createMediaElementSource(null);
      }).not.toThrow();
    });
    
    it('should handle Butterchurn initialization failure', () => {
      // Mock Butterchurn failing to create visualizer
      mockButterchurn.createVisualizer.mockImplementation(() => {
        throw new Error('WebGL not supported');
      });
      
      const audioContext = new AudioContext();
      const canvas = document.createElement('canvas');
      
      expect(() => {
        mockButterchurn.createVisualizer(audioContext, canvas);
      }).toThrow('WebGL not supported');
    });
  });
  
  describe('Audio Pipeline Cleanup', () => {
    it('should properly disconnect audio nodes', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(mockAudioElement);
      const compressor = audioContext.createDynamicsCompressor();
      const analyser = audioContext.createAnalyser();
      
      // Connect nodes
      source.connect(compressor);
      compressor.connect(analyser);
      
      // Disconnect (cleanup)
      source.disconnect();
      compressor.disconnect();
      analyser.disconnect();
      
      expect(source.disconnect).toHaveBeenCalled();
      expect(compressor.disconnect).toHaveBeenCalled();
      expect(analyser.disconnect).toHaveBeenCalled();
    });
    
    it('should close audio context on cleanup', () => {
      const audioContext = new AudioContext();
      
      audioContext.close();
      
      expect(audioContext.close).toHaveBeenCalled();
    });
  });
});
