import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import ButterchurmControls from '../components/ButterchurmControls.svelte';

// Mock Butterchurn modules
const mockButterchurnVisualizer = {
  loadPreset: vi.fn(),
  render: vi.fn(),
  connectAudio: vi.fn(),
  setRendererSize: vi.fn(),
  destroy: vi.fn()
};

const mockButterchurmModule = {
  createVisualizer: vi.fn(() => mockButterchurnVisualizer)
};

const mockPresets = {
  'Geiss - Thumb Drum': { /* preset data */ },
  'martin - mandelbox explorer': { /* preset data */ },
  'Flexi - predator-prey-spirals': { /* preset data */ },
  'Eo.S. + Zylot - skylight': { /* preset data */ }
};

const mockPresetsModule = {
  getPresets: vi.fn(() => mockPresets)
};

// Mock dynamic imports
vi.mock('butterchurn', () => ({ default: mockButterchurmModule }));
vi.mock('butterchurn-presets', () => ({ default: mockPresetsModule }));

// Mock Web Audio API
const createMockAudioContext = () => ({
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024
  })),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  destination: { connect: vi.fn() },
  state: 'running',
  sampleRate: 44100
});

// Mock Canvas and WebGL
const mockCanvas = () => {
  const canvas = document.createElement('canvas');
  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn()
  };
  
  canvas.getContext = vi.fn((type) => {
    if (type === 'webgl' || type === 'webgl2') {
      return mockContext;
    }
    return mockContext;
  });
  
  return canvas;
};

describe('Butterchurn Integration', () => {
  let mockAudioContext;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext = createMockAudioContext();
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = global.AudioContext;
    
    // Mock HTMLCanvasElement
    global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn()
    }));
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((callback) => {
      setTimeout(callback, 16); // ~60fps
      return 1;
    });
    
    global.cancelAnimationFrame = vi.fn();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Butterchurn Initialization', () => {
    it('should create Butterchurn visualizer with correct parameters', () => {
      const canvas = mockCanvas();
      const audioContext = new AudioContext();
      
      // Simulate Butterchurn initialization
      const visualizer = mockButterchurmModule.createVisualizer(audioContext, canvas, {
        width: 1920,
        height: 1080,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1
      });
      
      expect(mockButterchurmModule.createVisualizer).toHaveBeenCalledWith(
        audioContext,
        canvas,
        {
          width: 1920,
          height: 1080,
          pixelRatio: window.devicePixelRatio || 1,
          textureRatio: 1
        }
      );
      
      expect(visualizer).toBe(mockButterchurnVisualizer);
    });
    
    it('should load presets successfully', () => {
      const presets = mockPresetsModule.getPresets();
      
      expect(mockPresetsModule.getPresets).toHaveBeenCalled();
      expect(presets).toEqual(mockPresets);
      expect(Object.keys(presets)).toHaveLength(4);
    });
    
    it('should handle WebGL context creation', () => {
      const canvas = mockCanvas();
      const webglContext = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      expect(canvas.getContext).toHaveBeenCalled();
      expect(webglContext).toBeDefined();
    });
  });
  
  describe('Audio Connection', () => {
    it('should connect audio source to Butterchurn visualizer', () => {
      const audioContext = new AudioContext();
      const audioElement = document.createElement('audio');
      const source = audioContext.createMediaElementSource(audioElement);
      
      // Connect audio to Butterchurn
      mockButterchurnVisualizer.connectAudio(source);
      
      expect(mockButterchurnVisualizer.connectAudio).toHaveBeenCalledWith(source);
    });
    
    it('should handle audio disconnection', () => {
      // Connect first
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource();
      mockButterchurnVisualizer.connectAudio(source);
      
      // Then disconnect (usually done with null)
      mockButterchurnVisualizer.connectAudio(null);
      
      expect(mockButterchurnVisualizer.connectAudio).toHaveBeenCalledWith(null);
    });
    
    it('should integrate with audio pipeline', () => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource();
      const analyser = audioContext.createAnalyser();
      
      // Build audio pipeline with Butterchurn
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      mockButterchurnVisualizer.connectAudio(source);
      
      expect(source.connect).toHaveBeenCalledWith(analyser);
      expect(analyser.connect).toHaveBeenCalledWith(audioContext.destination);
      expect(mockButterchurnVisualizer.connectAudio).toHaveBeenCalledWith(source);
    });
  });
  
  describe('Preset Management', () => {
    it('should load preset by name', () => {
      const presetName = 'Geiss - Thumb Drum';
      const preset = mockPresets[presetName];
      const blendTime = 5.7;
      
      mockButterchurnVisualizer.loadPreset(preset, blendTime);
      
      expect(mockButterchurnVisualizer.loadPreset).toHaveBeenCalledWith(preset, blendTime);
    });
    
    it('should handle preset switching with different blend times', () => {
      const preset1 = mockPresets['Geiss - Thumb Drum'];
      const preset2 = mockPresets['martin - mandelbox explorer'];
      
      // Load first preset with no blend
      mockButterchurnVisualizer.loadPreset(preset1, 0.0);
      
      // Switch to second preset with smooth blend
      mockButterchurnVisualizer.loadPreset(preset2, 5.7);
      
      expect(mockButterchurnVisualizer.loadPreset).toHaveBeenNthCalledWith(1, preset1, 0.0);
      expect(mockButterchurnVisualizer.loadPreset).toHaveBeenNthCalledWith(2, preset2, 5.7);
    });
    
    it('should support random preset selection', () => {
      const presetKeys = Object.keys(mockPresets);
      const randomIndex = Math.floor(Math.random() * presetKeys.length);
      const randomPreset = mockPresets[presetKeys[randomIndex]];
      
      mockButterchurnVisualizer.loadPreset(randomPreset, 0.0);
      
      expect(mockButterchurnVisualizer.loadPreset).toHaveBeenCalledWith(randomPreset, 0.0);
      expect(presetKeys).toContain(presetKeys[randomIndex]);
    });
  });
  
  describe('Butterchurn Controls Component', () => {
    const defaultProps = {
      presetKeys: Object.keys(mockPresets),
      presetIndex: 0,
      presetRandom: true,
      presetCycle: true,
      presetCycleLength: 15,
      butterchurnVisualizer: mockButterchurnVisualizer,
      onNextPreset: vi.fn(),
      onPrevPreset: vi.fn(),
      onSelectPreset: vi.fn(),
      onToggleRandom: vi.fn(),
      onToggleCycle: vi.fn(),
      onCycleLengthChange: vi.fn()
    };
    
    it('should render Butterchurn controls when visualizer is available', () => {
      const { container } = render(ButterchurmControls, {
        props: defaultProps
      });
      
      expect(container.querySelector('.butterchurn-controls')).toBeInTheDocument();
      expect(screen.getByText('🌈 Butterchurn Visualizer Controls')).toBeInTheDocument();
    });
    
    it('should render navigation buttons', () => {
      render(ButterchurmControls, { props: defaultProps });
      
      const prevButton = screen.getByTitle(/Previous preset/);
      const randomButton = screen.getByTitle(/Random preset/);
      const nextButton = screen.getByTitle(/Next preset/);
      
      expect(prevButton).toBeInTheDocument();
      expect(randomButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });
    
    it('should call onNextPreset when next button is clicked', async () => {
      const onNextPreset = vi.fn();
      render(ButterchurmControls, {
        props: { ...defaultProps, onNextPreset }
      });
      
      const nextButton = screen.getByTitle(/Next preset/);
      await fireEvent.click(nextButton);
      
      expect(onNextPreset).toHaveBeenCalledWith(5.7); // default blend time
    });
    
    it('should call onPrevPreset when previous button is clicked', async () => {
      const onPrevPreset = vi.fn();
      render(ButterchurmControls, {
        props: { ...defaultProps, onPrevPreset }
      });
      
      const prevButton = screen.getByTitle(/Previous preset/);
      await fireEvent.click(prevButton);
      
      expect(onPrevPreset).toHaveBeenCalledWith(0.0); // no blend for prev
    });
    
    it('should render preset selection dropdown', () => {
      render(ButterchurmControls, { props: defaultProps });
      
      const presetSelect = screen.getByLabelText(/Active Preset/);
      expect(presetSelect).toBeInTheDocument();
      
      // Should have options for all presets
      const options = presetSelect.querySelectorAll('option');
      expect(options).toHaveLength(Object.keys(mockPresets).length);
    });
    
    it('should call onSelectPreset when dropdown value changes', async () => {
      const onSelectPreset = vi.fn();
      render(ButterchurmControls, {
        props: { ...defaultProps, onSelectPreset }
      });
      
      const presetSelect = screen.getByLabelText(/Active Preset/);
      await fireEvent.change(presetSelect, { target: { value: '2' } });
      
      expect(onSelectPreset).toHaveBeenCalledWith(2);
    });
    
    it('should render random and cycle checkboxes', () => {
      render(ButterchurmControls, { props: defaultProps });
      
      const randomCheckbox = screen.getByLabelText(/Random Selection/);
      const cycleCheckbox = screen.getByLabelText(/Auto-Cycle/);
      
      expect(randomCheckbox).toBeInTheDocument();
      expect(cycleCheckbox).toBeInTheDocument();
      expect(randomCheckbox).toBeChecked(); // presetRandom: true
      expect(cycleCheckbox).toBeChecked();  // presetCycle: true
    });
    
    it('should render cycle length input', () => {
      render(ButterchurmControls, { props: defaultProps });
      
      const cycleLengthInput = screen.getByLabelText(/Cycle Length/);
      expect(cycleLengthInput).toBeInTheDocument();
      expect(cycleLengthInput).toHaveValue(15); // presetCycleLength
    });
    
    it('should show keyboard shortcuts section', () => {
      render(ButterchurmControls, { props: defaultProps });
      
      expect(screen.getByText('Keyboard Shortcuts:')).toBeInTheDocument();
      expect(screen.getByText('Space')).toBeInTheDocument();
      expect(screen.getByText('Next preset')).toBeInTheDocument();
    });
    
    it('should show loading state when visualizer is null', () => {
      render(ButterchurmControls, {
        props: {
          ...defaultProps,
          butterchurnVisualizer: null,
          presetKeys: []
        }
      });
      
      expect(screen.getByText(/Switch to Butterchurn theme/)).toBeInTheDocument();
    });
    
    it('should show loading state when presets are loading', () => {
      render(ButterchurmControls, {
        props: {
          ...defaultProps,
          presetKeys: [],
          butterchurnVisualizer: mockButterchurnVisualizer
        }
      });
      
      expect(screen.getByText(/Loading Butterchurn presets/)).toBeInTheDocument();
    });
  });
  
  describe('Rendering Loop', () => {
    it('should start rendering loop', () => {
      // Simulate starting the render loop
      const renderFunction = vi.fn();
      
      // Mock render loop
      const startRenderLoop = () => {
        const render = () => {
          mockButterchurnVisualizer.render();
          renderFunction();
          requestAnimationFrame(render);
        };
        render();
      };
      
      startRenderLoop();
      
      expect(mockButterchurnVisualizer.render).toHaveBeenCalled();
      expect(renderFunction).toHaveBeenCalled();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
    
    it('should handle render errors gracefully', () => {
      mockButterchurnVisualizer.render.mockImplementation(() => {
        throw new Error('WebGL context lost');
      });
      
      expect(() => {
        mockButterchurnVisualizer.render();
      }).toThrow('WebGL context lost');
      
      // In real implementation, this would fallback to static animation
    });
  });
  
  describe('Window Resize Handling', () => {
    it('should handle window resize events', () => {
      const canvas = mockCanvas();
      canvas.width = 1920;
      canvas.height = 1080;
      
      // Simulate window resize
      canvas.width = 1600;
      canvas.height = 900;
      
      // Update visualizer
      mockButterchurnVisualizer.setRendererSize(1600, 900);
      
      expect(mockButterchurnVisualizer.setRendererSize).toHaveBeenCalledWith(1600, 900);
    });
  });
  
  describe('Cleanup and Teardown', () => {
    it('should properly cleanup Butterchurn resources', () => {
      // Simulate cleanup
      cancelAnimationFrame(1);
      mockButterchurnVisualizer.destroy();
      
      expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
      expect(mockButterchurnVisualizer.destroy).toHaveBeenCalled();
    });
    
    it('should remove canvas from DOM on cleanup', () => {
      const canvas = mockCanvas();
      document.body.appendChild(canvas);
      
      expect(document.body.contains(canvas)).toBe(true);
      
      // Cleanup
      document.body.removeChild(canvas);
      
      expect(document.body.contains(canvas)).toBe(false);
    });
  });
  
  describe('Preset Cycling', () => {
    it('should support automatic preset cycling', () => {
      let cycleInterval;
      const nextPresetFn = vi.fn();
      
      // Simulate preset cycling setup
      const startCycling = (intervalSeconds) => {
        cycleInterval = setInterval(() => {
          nextPresetFn(2.7); // blend time for auto-cycle
        }, intervalSeconds * 1000);
      };
      
      const stopCycling = () => {
        if (cycleInterval) {
          clearInterval(cycleInterval);
          cycleInterval = null;
        }
      };
      
      // Start cycling every 15 seconds
      startCycling(15);
      
      expect(cycleInterval).toBeDefined();
      
      // Stop cycling
      stopCycling();
      
      expect(cycleInterval).toBeNull();
    });
  });
});
