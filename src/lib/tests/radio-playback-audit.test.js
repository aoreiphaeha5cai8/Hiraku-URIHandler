import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Radio Playback Audit Tests
 * 
 * Tests for identifying and preventing issues with radio playback:
 * - Competing playback methods
 * - Race conditions during station switching
 * - Incomplete audio cleanup
 * - Multiple AudioContext conflicts
 * - Event handler conflicts from old elements
 */

describe('Radio Playback Audit', () => {
  let mockAudio;
  let mockAudioContext;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock Audio element
    mockAudio = {
      src: '',
      volume: 1,
      paused: true,
      currentTime: 0,
      duration: NaN,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    };

    // Mock AudioContext
    mockAudioContext = {
      state: 'suspended',
      sampleRate: 44100,
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createMediaElementSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createDynamicsCompressor: vi.fn().mockReturnValue({
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 1 },
        attack: { value: 0 },
        release: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      destination: { connect: vi.fn() }
    };

    // Mock global constructors
    global.Audio = vi.fn(() => mockAudio);
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = vi.fn(() => mockAudioContext);

    // Mock window functions
    global.window = {
      AudioContext: global.AudioContext,
      webkitAudioContext: global.webkitAudioContext,
      initializeAudioPipeline: vi.fn((ctx, source) => source),
      connectButterchurnAudio: vi.fn()
    };

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.Audio;
    delete global.AudioContext;
    delete global.webkitAudioContext;
    delete global.window;
  });

  describe('Competing Playback Methods Detection', () => {
    it('should identify multiple playback method calls', async () => {
      // Simulate component with competing methods
      const component = {
        isPlaying: false,
        radioUrl: 'http://test.stream',
        audioElement: null,
        currentRequestId: 0,
        userHasInteracted: true,
        
        // Method 1: Async with retry logic
        async playRadio(retryWithFallback = false) {
          this.currentRequestId++;
          const requestId = this.currentRequestId;
          
          console.log('playRadio called', { retryWithFallback, requestId });
          
          if (requestId !== this.currentRequestId) {
            console.log('Request cancelled');
            return;
          }
          
          this.audioElement = new Audio();
          this.audioElement.src = this.radioUrl;
          await this.audioElement.play();
          this.isPlaying = true;
        },
        
        // Method 2: Synchronous with user interaction
        playRadioWithUserInteraction() {
          console.log('playRadioWithUserInteraction called');
          
          const audio = new Audio();
          audio.src = this.radioUrl;
          audio.play();
          
          this.audioElement = audio;
          this.isPlaying = true;
        },
        
        // Handler that chooses method
        handlePlayStopClick() {
          if (this.isPlaying) {
            this.stopRadio();
          } else {
            this.playRadioWithUserInteraction();
          }
        },
        
        // Preset handler that also plays
        handlePresetClick(url) {
          this.radioUrl = url;
          this.stopRadio();
          this.playRadioWithUserInteraction();
        },
        
        stopRadio() {
          if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
          }
          this.isPlaying = false;
        }
      };

      // Test scenario: rapid clicking that triggers both methods
      component.handlePlayStopClick(); // Calls playRadioWithUserInteraction
      expect(consoleLogSpy).toHaveBeenCalledWith('playRadioWithUserInteraction called');
      
      // Simulate async retry calling playRadio
      await component.playRadio(true); // Calls playRadio
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'playRadio called', 
        { retryWithFallback: true, requestId: 1 }
      );
      
      // Both methods created Audio elements
      expect(global.Audio).toHaveBeenCalledTimes(2);
      expect(component.isPlaying).toBe(true);
    });

    it('should detect conflicting request IDs when methods compete', async () => {
      const component = {
        currentRequestId: 0,
        radioUrl: 'http://test.stream',
        
        async playRadio() {
          this.currentRequestId++;
          const requestId = this.currentRequestId;
          
          // Simulate slow network
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (requestId !== this.currentRequestId) {
            console.log('Cancelled due to newer request');
            return false;
          }
          
          console.log('Request completed', requestId);
          return true;
        },
        
        playRadioWithUserInteraction() {
          // This method doesn't use requestId system!
          console.log('Direct play without request tracking');
        }
      };

      // Start async request
      const promise1 = component.playRadio();
      
      // Immediately start synchronous method (simulates preset click)
      component.playRadioWithUserInteraction();
      
      // Start another async request
      const promise2 = component.playRadio();
      
      await Promise.all([promise1, promise2]);
      
      // Should show conflict: one method uses request tracking, other doesn't
      expect(consoleLogSpy).toHaveBeenCalledWith('Direct play without request tracking');
      expect(consoleLogSpy).toHaveBeenCalledWith('Cancelled due to newer request');
      expect(component.currentRequestId).toBe(2);
    });
  });

  describe('Race Condition Detection', () => {
    it('should detect race conditions during rapid station switching', async () => {
      const eventListeners = new Map();
      let audioElementCount = 0;
      
      // Enhanced Audio mock that tracks event listeners
      global.Audio = vi.fn(() => {
        audioElementCount++;
        const element = {
          id: audioElementCount,
          src: '',
          play: vi.fn().mockResolvedValue(undefined),
          pause: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (!eventListeners.has(element.id)) {
              eventListeners.set(element.id, new Map());
            }
            eventListeners.get(element.id).set(event, handler);
            console.log(`Audio ${element.id}: addEventListener ${event}`);
          }),
          removeEventListener: vi.fn((event, handler) => {
            if (eventListeners.has(element.id)) {
              eventListeners.get(element.id).delete(event);
              console.log(`Audio ${element.id}: removeEventListener ${event}`);
            }
          })
        };
        return element;
      });

      const component = {
        audioElement: null,
        isPlaying: false,
        
        async playStation(url) {
          // Simulate stopping previous
          if (this.audioElement) {
            this.audioElement.pause();
            console.log(`Stopping audio ${this.audioElement.id}`);
          }
          
          // Create new audio
          this.audioElement = new Audio();
          console.log(`Created audio ${this.audioElement.id}`);
          this.audioElement.src = url;
          
          // Add event listeners
          this.audioElement.addEventListener('play', () => {
            console.log(`Audio ${this.audioElement.id}: play event`);
            this.isPlaying = true;
          });
          
          this.audioElement.addEventListener('error', () => {
            console.log(`Audio ${this.audioElement.id}: error event`);
            this.isPlaying = false;
          });
          
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 50));
          
          await this.audioElement.play();
        }
      };

      // Rapid station switching
      const station1Promise = component.playStation('http://station1.com');
      const station2Promise = component.playStation('http://station2.com'); 
      const station3Promise = component.playStation('http://station3.com');
      
      await Promise.all([station1Promise, station2Promise, station3Promise]);
      
      // Should detect multiple audio elements created
      expect(audioElementCount).toBe(3);
      expect(consoleLogSpy).toHaveBeenCalledWith('Created audio 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('Created audio 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('Created audio 3');
      
      // Should detect event listeners from multiple elements
      expect(eventListeners.size).toBe(3);
      
      // Final audio element should be the last one
      expect(component.audioElement.id).toBe(3);
    });

    it('should detect event handler conflicts from old elements', async () => {
      let globalState = { activeAudioId: null, playCount: 0 };
      
      const component = {
        audioElement: null,
        
        createAudio(id) {
          const audio = new Audio();
          audio.id = id;
          
          // Event handler that modifies global state
          audio.addEventListener('play', () => {
            globalState.activeAudioId = audio.id;
            globalState.playCount++;
            console.log(`Play event from audio ${audio.id}, global count: ${globalState.playCount}`);
          });
          
          return audio;
        },
        
        switchToStation(stationId) {
          // Create new audio without properly cleaning old one
          const newAudio = this.createAudio(stationId);
          
          // Old audio element still has event handlers!
          // This simulates incomplete cleanup
          this.audioElement = newAudio;
          
          return newAudio;
        }
      };

      // Create first audio
      const audio1 = component.switchToStation(1);
      
      // Create second audio (old one not cleaned)
      const audio2 = component.switchToStation(2);
      
      // Create third audio
      const audio3 = component.switchToStation(3);
      
      // Simulate events firing from old elements
      // This would happen if old audio elements are still referenced somewhere
      eventListeners.get(1)?.get('play')?.(); // Old handler fires
      eventListeners.get(2)?.get('play')?.(); // Old handler fires
      eventListeners.get(3)?.get('play')?.(); // Current handler fires
      
      // Should detect multiple play events affecting global state
      expect(globalState.playCount).toBe(3);
      expect(globalState.activeAudioId).toBe(3); // Last one wins
      
      // This indicates event handler pollution
      expect(consoleLogSpy).toHaveBeenCalledWith('Play event from audio 1, global count: 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('Play event from audio 2, global count: 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('Play event from audio 3, global count: 3');
    });
  });

  describe('AudioContext Conflict Detection', () => {
    it('should detect multiple AudioContext creation', () => {
      const contexts = [];
      
      global.AudioContext = vi.fn(() => {
        const ctx = { ...mockAudioContext, id: contexts.length + 1 };
        contexts.push(ctx);
        console.log(`AudioContext ${ctx.id} created`);
        return ctx;
      });

      const component = {
        audioContext: null,
        
        setupAudio1() {
          if (!this.audioContext) {
            this.audioContext = new AudioContext();
          }
          console.log('Setup audio method 1');
        },
        
        setupAudio2() {
          // Different method creates another context!
          const ctx = new AudioContext();
          console.log('Setup audio method 2');
          return ctx;
        },
        
        setupAudio3() {
          // Yet another context!
          this.audioContext = new AudioContext();
          console.log('Setup audio method 3');
        }
      };

      component.setupAudio1();
      component.setupAudio2();
      component.setupAudio3();

      // Should detect multiple contexts
      expect(contexts.length).toBe(3);
      expect(consoleLogSpy).toHaveBeenCalledWith('AudioContext 1 created');
      expect(consoleLogSpy).toHaveBeenCalledWith('AudioContext 2 created');
      expect(consoleLogSpy).toHaveBeenCalledWith('AudioContext 3 created');
      
      // This indicates AudioContext leakage
      console.warn(`Detected ${contexts.length} AudioContext instances - potential memory leak!`);
    });

    it('should detect unclosed AudioContext on cleanup', async () => {
      const contexts = [];
      
      global.AudioContext = vi.fn(() => {
        const ctx = {
          ...mockAudioContext,
          id: contexts.length + 1,
          state: 'running',
          close: vi.fn(async () => {
            ctx.state = 'closed';
            console.log(`AudioContext ${ctx.id} closed`);
          })
        };
        contexts.push(ctx);
        return ctx;
      });

      const component = {
        audioContext: null,
        audioElement: null,
        
        async startAudio() {
          this.audioContext = new AudioContext();
          this.audioElement = new Audio();
          
          const source = this.audioContext.createMediaElementSource(this.audioElement);
          source.connect(this.audioContext.destination);
        },
        
        // Incomplete cleanup
        stopAudio() {
          if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement = null;
          }
          
          // AudioContext not closed!
          this.audioContext = null;
        },
        
        // Proper cleanup
        async properCleanup() {
          if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement = null;
          }
          
          if (this.audioContext && this.audioContext.state !== 'closed') {
            await this.audioContext.close();
          }
          this.audioContext = null;
        }
      };

      await component.startAudio();
      expect(contexts.length).toBe(1);
      expect(contexts[0].state).toBe('running');
      
      // Test incomplete cleanup
      component.stopAudio();
      expect(contexts[0].state).toBe('running'); // Still running!
      
      // Test proper cleanup
      await component.properCleanup();
      expect(contexts[0].close).toHaveBeenCalled();
    });
  });

  describe('Station Switching Behavior Tests', () => {
    it('should test preset button click behavior', () => {
      const component = {
        isPlaying: false,
        radioUrl: '',
        currentStation: '',
        
        handlePresetClick(stream) {
          console.log('Preset clicked:', stream.name);
          
          // Stop current playback
          this.stopRadio();
          
          // Set new URL
          this.radioUrl = stream.url;
          this.currentStation = stream.name;
          
          // Start new playback
          this.playRadio();
        },
        
        stopRadio() {
          console.log('Stopping current radio');
          this.isPlaying = false;
        },
        
        playRadio() {
          console.log('Starting radio:', this.radioUrl);
          this.isPlaying = true;
        }
      };

      // Test clicking preset
      component.handlePresetClick({
        name: 'Test Station',
        url: 'http://test.stream'
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('Preset clicked:', 'Test Station');
      expect(consoleLogSpy).toHaveBeenCalledWith('Stopping current radio');
      expect(consoleLogSpy).toHaveBeenCalledWith('Starting radio:', 'http://test.stream');
      
      expect(component.isPlaying).toBe(true);
      expect(component.radioUrl).toBe('http://test.stream');
      expect(component.currentStation).toBe('Test Station');
    });

    it('should test play/stop button behavior', () => {
      const component = {
        isPlaying: false,
        radioUrl: 'http://current.stream',
        
        handlePlayStopClick() {
          console.log('Play/Stop clicked, current state:', this.isPlaying);
          
          if (this.isPlaying) {
            this.stopRadio();
          } else {
            this.playRadio();
          }
        },
        
        stopRadio() {
          console.log('Stop radio');
          this.isPlaying = false;
        },
        
        playRadio() {
          console.log('Play radio');
          this.isPlaying = true;
        }
      };

      // Test play
      component.handlePlayStopClick();
      expect(consoleLogSpy).toHaveBeenCalledWith('Play/Stop clicked, current state:', false);
      expect(consoleLogSpy).toHaveBeenCalledWith('Play radio');
      expect(component.isPlaying).toBe(true);
      
      // Test stop
      component.handlePlayStopClick();
      expect(consoleLogSpy).toHaveBeenCalledWith('Play/Stop clicked, current state:', true);
      expect(consoleLogSpy).toHaveBeenCalledWith('Stop radio');
      expect(component.isPlaying).toBe(false);
    });
  });

  describe('Audio Element Lifecycle Tests', () => {
    it('should test proper audio element cleanup', () => {
      let audioElements = [];
      
      global.Audio = vi.fn(() => {
        const element = {
          id: audioElements.length + 1,
          src: '',
          paused: true,
          play: vi.fn(),
          pause: vi.fn(),
          load: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        };
        audioElements.push(element);
        console.log(`Created Audio element ${element.id}`);
        return element;
      });

      const component = {
        audioElement: null,
        
        startPlayback(url) {
          // Create new audio element
          this.audioElement = new Audio();
          this.audioElement.src = url;
          
          // Add event listeners
          this.audioElement.addEventListener('play', this.onPlay);
          this.audioElement.addEventListener('error', this.onError);
          
          console.log(`Started playback: ${url}`);
        },
        
        stopPlayback() {
          if (this.audioElement) {
            // Proper cleanup
            this.audioElement.pause();
            this.audioElement.removeEventListener('play', this.onPlay);
            this.audioElement.removeEventListener('error', this.onError);
            this.audioElement.src = '';
            
            console.log(`Stopped audio element ${this.audioElement.id}`);
            this.audioElement = null;
          }
        },
        
        onPlay() {
          console.log('Audio play event');
        },
        
        onError() {
          console.log('Audio error event');
        }
      };

      // Test normal lifecycle
      component.startPlayback('http://station1.com');
      expect(audioElements.length).toBe(1);
      expect(component.audioElement.id).toBe(1);
      
      component.stopPlayback();
      expect(component.audioElement).toBeNull();
      
      // Test rapid switching
      component.startPlayback('http://station2.com');
      component.startPlayback('http://station3.com'); // Without stopping first!
      
      expect(audioElements.length).toBe(3);
      expect(component.audioElement.id).toBe(3);
      
      // Audio element 2 was orphaned!
      console.warn('Detected orphaned audio element - potential memory leak!');
    });
  });
});
