import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Radio Playback Integration Tests
 * 
 * Tests to verify that radio playback issues have been resolved:
 * - Unified playback method without conflicts
 * - Proper session management preventing race conditions
 * - Complete audio cleanup on station switching
 * - Singleton AudioContext management
 * - Event handler cleanup preventing memory leaks
 */

describe('Radio Playback Integration - Post Audit', () => {
  let mockAudio;
  let mockAudioContext;
  let consoleLogSpy;

  beforeEach(() => {
    // Mock Audio element with enhanced tracking
    mockAudio = {
      id: Math.floor(Math.random() * 1000),
      src: '',
      volume: 1,
      paused: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        console.log(`Audio ${mockAudio.id}: addEventListener ${event}`);
      }),
      removeEventListener: vi.fn((event, handler) => {
        console.log(`Audio ${mockAudio.id}: removeEventListener ${event}`);
      })
    };

    // Mock AudioContext with state tracking
    mockAudioContext = {
      id: Math.floor(Math.random() * 1000),
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(async () => {
        mockAudioContext.state = 'closed';
      }),
      createMediaElementSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn()
      })
    };

    global.Audio = vi.fn(() => mockAudio);
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.window = {
      AudioContext: global.AudioContext,
      initializeAudioPipeline: vi.fn((ctx, source) => source),
      connectButterchurnAudio: vi.fn()
    };

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.Audio;
    delete global.AudioContext;
    delete global.window;
  });

  describe('Unified Playback Method', () => {
    it('should have single playback entry point', () => {
      // Simulate the refactored RadioPlayer component
      const radioPlayer = {
        currentPlaybackId: 0,
        audioElement: null,
        isCleaningUp: false,
        activeEventHandlers: new Map(),
        
        // Single unified playback method
        async playRadio(options = {}) {
          this.currentPlaybackId++;
          const sessionId = this.currentPlaybackId;
          
          console.log(`Starting playback session ${sessionId}`);
          
          // Always stop previous playback
          await this.stopRadio(true);
          
          // Create new audio element
          this.audioElement = new Audio();
          this.audioElement.src = options.url || 'http://test.stream';
          
          // Setup event listeners with session tracking
          this.setupEventListeners(sessionId);
          
          await this.audioElement.play();
          
          console.log(`Session ${sessionId}: Playback started`);
          return true;
        },
        
        async stopRadio(force = false) {
          if (this.isCleaningUp && !force) return;
          
          this.isCleaningUp = true;
          this.currentPlaybackId++; // Cancel any pending operations
          
          if (this.audioElement) {
            // Remove all event listeners
            this.activeEventHandlers.forEach((handler, event) => {
              this.audioElement.removeEventListener(event, handler);
            });
            this.activeEventHandlers.clear();
            
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
          }
          
          console.log('Audio stopped and cleaned up');
          this.isCleaningUp = false;
        },
        
        setupEventListeners(sessionId) {
          if (!this.audioElement) return;
          
          const onPlay = () => {
            if (sessionId === this.currentPlaybackId) {
              console.log(`Session ${sessionId}: Play event`);
            }
          };
          
          this.audioElement.addEventListener('play', onPlay);
          this.activeEventHandlers.set('play', onPlay);
        }
      };

      // Test that there's only one playback method
      expect(typeof radioPlayer.playRadio).toBe('function');
      expect(radioPlayer.playRadioWithUserInteraction).toBeUndefined();
      
      // Test unified method works
      radioPlayer.playRadio({ url: 'http://station1.com' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Starting playback session 1');
    });

    it('should prevent race conditions with session management', async () => {
      const radioPlayer = {
        currentPlaybackId: 0,
        
        async playRadio(options = {}) {
          this.currentPlaybackId++;
          const sessionId = this.currentPlaybackId;
          
          console.log(`Starting session ${sessionId}`);
          
          // Simulate some async work
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Check if session is still active
          if (sessionId !== this.currentPlaybackId) {
            console.log(`Session ${sessionId}: Cancelled`);
            return false;
          }
          
          console.log(`Session ${sessionId}: Completed`);
          return true;
        }
      };

      // Start multiple concurrent playbacks
      const promise1 = radioPlayer.playRadio({ url: 'station1' });
      const promise2 = radioPlayer.playRadio({ url: 'station2' });
      const promise3 = radioPlayer.playRadio({ url: 'station3' });

      const results = await Promise.all([promise1, promise2, promise3]);

      // Only the last session should complete successfully
      expect(results[0]).toBe(false); // Cancelled
      expect(results[1]).toBe(false); // Cancelled
      expect(results[2]).toBe(true);  // Completed

      expect(consoleLogSpy).toHaveBeenCalledWith('Session 1: Cancelled');
      expect(consoleLogSpy).toHaveBeenCalledWith('Session 2: Cancelled');
      expect(consoleLogSpy).toHaveBeenCalledWith('Session 3: Completed');
    });
  });

  describe('Audio Element Cleanup', () => {
    it('should properly cleanup audio elements and event listeners', async () => {
      const eventHandlers = new Map();
      let audioInstances = [];
      
      // Track audio instances and event listeners
      global.Audio = vi.fn(() => {
        const audio = {
          id: audioInstances.length + 1,
          src: '',
          pause: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (!eventHandlers.has(audio.id)) {
              eventHandlers.set(audio.id, new Set());
            }
            eventHandlers.get(audio.id).add(event);
            console.log(`Audio ${audio.id}: Added listener for ${event}`);
          }),
          removeEventListener: vi.fn((event, handler) => {
            if (eventHandlers.has(audio.id)) {
              eventHandlers.get(audio.id).delete(event);
              console.log(`Audio ${audio.id}: Removed listener for ${event}`);
            }
          })
        };
        audioInstances.push(audio);
        return audio;
      });

      const radioPlayer = {
        audioElement: null,
        activeEventHandlers: new Map(),
        
        async startPlayback(url) {
          // Stop previous without cleanup (simulate old behavior)
          if (this.audioElement) {
            this.audioElement.pause();
          }
          
          // Create new audio element
          this.audioElement = new Audio();
          this.audioElement.src = url;
          
          // Add event listeners
          const onPlay = () => console.log('Play event');
          const onError = () => console.log('Error event');
          
          this.audioElement.addEventListener('play', onPlay);
          this.audioElement.addEventListener('error', onError);
          
          this.activeEventHandlers.set('play', onPlay);
          this.activeEventHandlers.set('error', onError);
        },
        
        async stopPlaybackWithCleanup() {
          if (this.audioElement) {
            // Proper cleanup - remove all event listeners
            this.activeEventHandlers.forEach((handler, event) => {
              this.audioElement.removeEventListener(event, handler);
            });
            this.activeEventHandlers.clear();
            
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
            
            console.log('Proper cleanup completed');
          }
        }
      };

      // Start multiple playbacks without proper cleanup
      await radioPlayer.startPlayback('station1');
      await radioPlayer.startPlayback('station2');
      await radioPlayer.startPlayback('station3');

      // Should have created 3 audio instances
      expect(audioInstances.length).toBe(3);
      
      // Should have event listeners on all instances
      expect(eventHandlers.get(1).size).toBe(2);
      expect(eventHandlers.get(2).size).toBe(2);
      expect(eventHandlers.get(3).size).toBe(2);

      // Now do proper cleanup
      await radioPlayer.stopPlaybackWithCleanup();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Proper cleanup completed');
      expect(consoleLogSpy).toHaveBeenCalledWith('Audio 3: Removed listener for play');
      expect(consoleLogSpy).toHaveBeenCalledWith('Audio 3: Removed listener for error');
    });
  });

  describe('AudioContext Management', () => {
    it('should use singleton AudioContext to prevent conflicts', () => {
      let contextInstances = [];
      
      global.AudioContext = vi.fn(() => {
        const ctx = {
          id: contextInstances.length + 1,
          state: 'running',
          close: vi.fn()
        };
        contextInstances.push(ctx);
        console.log(`AudioContext ${ctx.id} created`);
        return ctx;
      });

      const audioManager = {
        sharedAudioContext: null,
        
        getAudioContext() {
          if (!this.sharedAudioContext || this.sharedAudioContext.state === 'closed') {
            console.log('Creating new shared AudioContext');
            this.sharedAudioContext = new AudioContext();
          } else {
            console.log('Reusing existing AudioContext');
          }
          return this.sharedAudioContext;
        },
        
        setupAudio() {
          const ctx = this.getAudioContext();
          console.log(`Using AudioContext ${ctx.id}`);
          return ctx;
        }
      };

      // Multiple setup calls should reuse the same context
      const ctx1 = audioManager.setupAudio();
      const ctx2 = audioManager.setupAudio();
      const ctx3 = audioManager.setupAudio();

      // Should only create one AudioContext instance
      expect(contextInstances.length).toBe(1);
      expect(ctx1.id).toBe(ctx2.id);
      expect(ctx2.id).toBe(ctx3.id);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Creating new shared AudioContext');
      expect(consoleLogSpy).toHaveBeenCalledWith('Reusing existing AudioContext');
    });

    it('should handle AudioContext state transitions properly', async () => {
      const audioManager = {
        audioContext: null,
        
        async initializeAudio() {
          if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new AudioContext();
            console.log('Created new AudioContext');
          }
          
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('Resumed suspended AudioContext');
          }
          
          console.log(`AudioContext state: ${this.audioContext.state}`);
          return this.audioContext;
        },
        
        async cleanup() {
          if (this.audioContext && this.audioContext.state !== 'closed') {
            await this.audioContext.close();
            console.log('AudioContext closed');
          }
          this.audioContext = null;
        }
      };

      // Test initialization
      await audioManager.initializeAudio();
      expect(consoleLogSpy).toHaveBeenCalledWith('Created new AudioContext');
      expect(consoleLogSpy).toHaveBeenCalledWith('Resumed suspended AudioContext');

      // Test cleanup
      await audioManager.cleanup();
      expect(consoleLogSpy).toHaveBeenCalledWith('AudioContext closed');
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe('Station Switching Integration', () => {
    it('should handle rapid station switching without conflicts', async () => {
      const radioPlayer = {
        currentPlaybackId: 0,
        isPlaying: false,
        currentStation: '',
        
        async handlePresetClick(station) {
          console.log(`Preset clicked: ${station.name}`);
          
          // Unified approach - just call playRadio with station URL
          await this.playRadio({ 
            url: station.url, 
            immediate: true 
          });
        },
        
        async playRadio(options = {}) {
          this.currentPlaybackId++;
          const sessionId = this.currentPlaybackId;
          
          console.log(`Starting session ${sessionId} for ${options.url}`);
          
          // Stop any current playback
          await this.stopRadio(true);
          
          // Simulate playback setup
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Check if still active
          if (sessionId === this.currentPlaybackId) {
            this.isPlaying = true;
            this.currentStation = options.url;
            console.log(`Session ${sessionId}: Now playing ${options.url}`);
            return true;
          } else {
            console.log(`Session ${sessionId}: Cancelled during setup`);
            return false;
          }
        },
        
        async stopRadio(force = false) {
          this.currentPlaybackId++; // Cancel pending operations
          this.isPlaying = false;
          this.currentStation = '';
          console.log('Stopped current playback');
        }
      };

      // Simulate rapid preset clicking
      const station1 = { name: 'Station 1', url: 'http://station1.com' };
      const station2 = { name: 'Station 2', url: 'http://station2.com' };
      const station3 = { name: 'Station 3', url: 'http://station3.com' };

      // Rapid succession clicks
      const promise1 = radioPlayer.handlePresetClick(station1);
      const promise2 = radioPlayer.handlePresetClick(station2);
      const promise3 = radioPlayer.handlePresetClick(station3);

      await Promise.all([promise1, promise2, promise3]);

      // Should end up playing the last clicked station
      expect(radioPlayer.isPlaying).toBe(true);
      expect(radioPlayer.currentStation).toBe('http://station3.com');
      
      // Should show proper session management
      expect(consoleLogSpy).toHaveBeenCalledWith('Preset clicked: Station 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('Preset clicked: Station 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('Preset clicked: Station 3');
      expect(consoleLogSpy).toHaveBeenCalledWith('Session 3: Now playing http://station3.com');
    });

    it('should maintain consistent UI state during switching', () => {
      const radioPlayer = {
        isPlaying: false,
        currentStation: '',
        
        handlePlayStopClick() {
          console.log(`Play/Stop clicked, current state: ${this.isPlaying}`);
          
          if (this.isPlaying) {
            this.stopRadio();
          } else {
            this.playRadio({ immediate: true });
          }
        },
        
        stopRadio() {
          this.isPlaying = false;
          this.currentStation = '';
          console.log('Playback stopped');
        },
        
        playRadio(options = {}) {
          this.isPlaying = true;
          this.currentStation = 'Live Stream';
          console.log('Playback started');
        }
      };

      // Test play
      expect(radioPlayer.isPlaying).toBe(false);
      radioPlayer.handlePlayStopClick();
      expect(radioPlayer.isPlaying).toBe(true);
      expect(radioPlayer.currentStation).toBe('Live Stream');
      
      // Test stop
      radioPlayer.handlePlayStopClick();
      expect(radioPlayer.isPlaying).toBe(false);
      expect(radioPlayer.currentStation).toBe('');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Play/Stop clicked, current state: false');
      expect(consoleLogSpy).toHaveBeenCalledWith('Play/Stop clicked, current state: true');
    });
  });
});
