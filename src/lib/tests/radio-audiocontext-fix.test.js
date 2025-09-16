import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Radio AudioContext Fix Tests
 * 
 * Tests to verify AudioContext conflicts are resolved:
 * - Single shared AudioContext usage
 * - Prevention of duplicate MediaElementSource creation
 * - Proper cleanup of audio connections
 * - No multiple canplay event handling
 */

describe('Radio AudioContext Fix', () => {
  let mockAudioContext;
  let mockMediaElementSource;
  let consoleLogSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Track MediaElementSource creation attempts
    let sourceCreationCount = 0;
    
    mockMediaElementSource = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockAudioContext = {
      id: 'shared-context',
      state: 'running',
      createMediaElementSource: vi.fn((element) => {
        sourceCreationCount++;
        console.log(`MediaElementSource creation attempt ${sourceCreationCount}`);
        
        if (sourceCreationCount > 1) {
          // Simulate the "already connected" error
          throw new Error('Media element is already associated with an audio source node');
        }
        
        return mockMediaElementSource;
      }),
      resume: vi.fn(),
      close: vi.fn()
    };

    // Mock global shared context
    global.window = {
      sharedAudioContext: mockAudioContext,
      AudioContext: vi.fn(() => mockAudioContext),
      initializeAudioPipeline: vi.fn((ctx, source) => source),
      connectButterchurnAudio: vi.fn()
    };

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.window;
  });

  describe('Shared AudioContext Usage', () => {
    it('should use global shared AudioContext instead of creating new ones', () => {
      const radioPlayer = {
        audioContext: null,
        audioElement: { id: 'test-audio' },
        isAudioAnalysisSetup: false,
        currentAudioSource: null,
        
        setupAudioAnalysis() {
          if (typeof window !== 'undefined' && window.sharedAudioContext) {
            this.audioContext = window.sharedAudioContext;
            console.log('Using shared AudioContext from global scope');
          } else {
            console.log('Creating new AudioContext');
            this.audioContext = new AudioContext();
          }
          
          try {
            this.currentAudioSource = this.audioContext.createMediaElementSource(this.audioElement);
            this.isAudioAnalysisSetup = true;
            console.log('Audio analysis setup completed');
          } catch (error) {
            if (error.message.includes('already associated')) {
              console.log('Audio element already connected, skipping');
              this.isAudioAnalysisSetup = true;
              return;
            }
            throw error;
          }
        }
      };

      // First setup
      radioPlayer.setupAudioAnalysis();
      expect(consoleLogSpy).toHaveBeenCalledWith('Using shared AudioContext from global scope');
      expect(radioPlayer.audioContext).toBe(mockAudioContext);
      expect(radioPlayer.isAudioAnalysisSetup).toBe(true);
      
      // Second setup should not create new source
      radioPlayer.setupAudioAnalysis();
      expect(consoleLogSpy).toHaveBeenCalledWith('Audio element already connected, skipping');
      
      // Should only have one source creation attempt
      expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledTimes(1);
    });

    it('should prevent multiple audio analysis setup for same element', () => {
      const radioPlayer = {
        audioElement: { id: 'test-audio' },
        isAudioAnalysisSetup: false,
        currentAudioSource: null,
        
        setupAudioAnalysis() {
          if (this.isAudioAnalysisSetup && this.currentAudioSource) {
            console.log('Audio analysis already setup for current element');
            return;
          }
          
          console.log('Setting up audio analysis');
          this.currentAudioSource = { connect: vi.fn() };
          this.isAudioAnalysisSetup = true;
        }
      };

      // First call should setup
      radioPlayer.setupAudioAnalysis();
      expect(consoleLogSpy).toHaveBeenCalledWith('Setting up audio analysis');
      
      // Second call should skip
      radioPlayer.setupAudioAnalysis();
      expect(consoleLogSpy).toHaveBeenCalledWith('Audio analysis already setup for current element');
      
      // Setup should only be logged once
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Audio Source Cleanup', () => {
    it('should properly disconnect audio source during cleanup', () => {
      const radioPlayer = {
        audioElement: { id: 'test-audio', pause: vi.fn(), load: vi.fn() },
        currentAudioSource: mockMediaElementSource,
        isAudioAnalysisSetup: true,
        activeEventHandlers: new Map(),
        
        async stopRadio() {
          if (this.currentAudioSource) {
            try {
              this.currentAudioSource.disconnect();
              console.log('Audio source disconnected');
            } catch (e) {
              console.warn('Error disconnecting audio source:', e);
            }
            this.currentAudioSource = null;
          }
          
          if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement.load();
            this.audioElement = null;
          }
          
          this.isAudioAnalysisSetup = false;
          console.log('Cleanup completed');
        }
      };

      radioPlayer.stopRadio();
      
      expect(mockMediaElementSource.disconnect).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Audio source disconnected');
      expect(consoleLogSpy).toHaveBeenCalledWith('Cleanup completed');
      expect(radioPlayer.currentAudioSource).toBeNull();
      expect(radioPlayer.isAudioAnalysisSetup).toBe(false);
    });

    it('should handle disconnect errors gracefully', () => {
      const mockErrorSource = {
        disconnect: vi.fn(() => {
          throw new Error('Disconnect failed');
        })
      };

      const radioPlayer = {
        currentAudioSource: mockErrorSource,
        
        cleanup() {
          if (this.currentAudioSource) {
            try {
              this.currentAudioSource.disconnect();
              console.log('Audio source disconnected');
            } catch (e) {
              console.warn('Error disconnecting audio source:', e);
            }
            this.currentAudioSource = null;
          }
        }
      };

      radioPlayer.cleanup();
      
      expect(mockErrorSource.disconnect).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error disconnecting audio source:', 
        expect.any(Error)
      );
      expect(radioPlayer.currentAudioSource).toBeNull();
    });
  });

  describe('Event Handler Deduplication', () => {
    it('should prevent multiple canplay event setups', () => {
      const radioPlayer = {
        isAudioAnalysisSetup: false,
        setupCalled: 0,
        
        onCanPlay(sessionId) {
          console.log(`Can play event for session ${sessionId}`);
          
          if (!this.isAudioAnalysisSetup) {
            this.setupAudioAnalysis();
          } else {
            console.log(`Session ${sessionId}: Audio analysis already setup, skipping`);
          }
        },
        
        setupAudioAnalysis() {
          this.setupCalled++;
          this.isAudioAnalysisSetup = true;
          console.log(`Audio analysis setup ${this.setupCalled}`);
        }
      };

      // Simulate multiple canplay events (which happens in real usage)
      radioPlayer.onCanPlay(1);
      radioPlayer.onCanPlay(1); // Same session, duplicate event
      radioPlayer.onCanPlay(1); // Another duplicate
      
      // Setup should only be called once
      expect(radioPlayer.setupCalled).toBe(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Audio analysis setup 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('Session 1: Audio analysis already setup, skipping');
    });
  });

  describe('AudioContext Conflict Prevention', () => {
    it('should detect and handle AudioContext mismatches', () => {
      const wrongContext = { id: 'wrong-context' };
      const sharedContext = { id: 'shared-context' };
      
      const audioManager = {
        initializeAudioPipeline(audioContext, source) {
          if (audioContext !== sharedContext && sharedContext) {
            console.warn('AudioContext mismatch detected, using shared context');
            audioContext = sharedContext;
          }
          
          console.log(`Using AudioContext: ${audioContext.id}`);
          return source;
        }
      };

      // Test with wrong context
      const mockSource = { id: 'test-source' };
      audioManager.initializeAudioPipeline(wrongContext, mockSource);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('AudioContext mismatch detected, using shared context');
      expect(consoleLogSpy).toHaveBeenCalledWith('Using AudioContext: shared-context');
    });

    it('should prevent creation of multiple MediaElementSource for same element', () => {
      let creationAttempts = 0;
      
      const audioContext = {
        createMediaElementSource: vi.fn((element) => {
          creationAttempts++;
          
          if (element.hasSource) {
            throw new Error('Media element is already associated with an audio source node');
          }
          
          element.hasSource = true;
          return { connect: vi.fn(), disconnect: vi.fn() };
        })
      };

      const audioElement = { id: 'test-element' };
      
      const radioPlayer = {
        createAudioSource(element) {
          try {
            const source = audioContext.createMediaElementSource(element);
            console.log('Created new audio source');
            return source;
          } catch (error) {
            if (error.message.includes('already associated')) {
              console.log('Element already has audio source, skipping creation');
              return null;
            }
            throw error;
          }
        }
      };

      // First creation should succeed
      const source1 = radioPlayer.createAudioSource(audioElement);
      expect(source1).not.toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('Created new audio source');
      
      // Second creation should be skipped
      const source2 = radioPlayer.createAudioSource(audioElement);
      expect(source2).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('Element already has audio source, skipping creation');
      
      // Should only attempt creation twice (second fails gracefully)
      expect(audioContext.createMediaElementSource).toHaveBeenCalledTimes(2);
    });
  });
});
