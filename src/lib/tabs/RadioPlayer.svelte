<script lang="ts">
  // Simple radio player without Tauri dependencies
  let radioUrl = $state("");
  let isPlaying = $state(false);
  let volume = $state(70);
  let currentStation = $state("");
  let streamInfo = $state<{title?: string, bitrate?: string, format?: string}>({});
  // Audio state - centralized management
  let audioElement: HTMLAudioElement | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let audioDataArray: Uint8Array | null = null;
  let currentAudioSource: MediaElementAudioSourceNode | null = null;
  let isAudioAnalysisSetup: boolean = false;
  
  // Playback control - unified system
  let currentPlaybackId = 0; // Track current playback session to prevent conflicts
  let isRetrying = $state(false);
  let retryCount = $state(0);
  let maxRetries = 2;
  let lastAttemptedUrl = $state("");
  let consecutiveFailures = $state(0);
  let isBlocked = $state(false);
  let userHasInteracted = $state(false); // Track if user has clicked any button
  
  // Audio cleanup tracking
  let activeEventHandlers: Map<string, () => void> = new Map();
  let isCleaningUp = false;

  const popularStreams = [
    // Original working streams
    { 
      name: "🎵 Lofi Hip Hop", 
      url: "http://stream.zeno.fm/0r0xa792kwzuv",
      fallback: "https://stream.zeno.fm/0r0xa792kwzuv",
      format: "MP3"
    },
    { 
      name: "🎶 SomaFM Groove Salad", 
      url: "http://ice1.somafm.com/groovesalad-256-mp3",
      fallback: "https://ice1.somafm.com/groovesalad-256-mp3", 
      format: "MP3"
    },
    { 
      name: "🎧 Calm Radio Jazz", 
      url: "http://streams.calmradio.com/api/39/128/stream",
      fallback: "https://streams.calmradio.com/api/39/128/stream",
      format: "MP3"
    },
    { 
      name: "🎼 SomaFM Drone Zone", 
      url: "http://ice1.somafm.com/dronezone-256-mp3",
      fallback: "https://ice1.somafm.com/dronezone-256-mp3",
      format: "MP3"
    },
    
    // Electronic & Breakcore stations
    { 
      name: "🔥 Breakcorn Radio - Main", 
      url: "https://stream.breakcorn.ru/main",
      fallback: "",
      format: "MP3"
    },
    { 
      name: "🎹 Breakcorn Radio - Mezzo", 
      url: "https://stream.breakcorn.ru/mezzo",
      fallback: "",
      format: "MP3"
    },
    { 
      name: "🤖 Breakcore Mashcore Radio", 
      url: "https://radio.mosco.win/play",
      fallback: "",
      format: "MP3"
    },
    { 
      name: "⛵ Nautic Radio Groningen", 
      url: "http://stream.nauticradio.net:14280/",
      fallback: "",
      format: "MP3"
    },
    
    // Radio Schizoid channels
    { 
      name: "🌊 Radio Schizoid - Chillout", 
      url: "http://94.130.113.214:8000/chill",
      fallback: "",
      format: "MP3"
    },
    { 
      name: "🌌 Radio Schizoid - Dub Techno", 
      url: "http://94.130.113.214:8000/dubtechno",
      fallback: "",
      format: "MP3"
    },
    { 
      name: "🌀 Radio Schizoid - Progressive", 
      url: "http://94.130.113.214:8000/prog",
      fallback: "",
      format: "MP3"
    },
    { 
      name: "🌍 Radio Schizoid - PsyTrance", 
      url: "http://94.130.113.214:8000/schizoid",
      fallback: "",
      format: "MP3"
    },
    
    // Test & Demo
    { 
      name: "📻 SHOUTcast Example", 
      url: "http://listen.shoutcast.com/tunein-mp3-pls",
      fallback: "https://listen.shoutcast.com/tunein-mp3-pls",
      format: "PLS"
    },
    { 
      name: "🔊 Test Tone (WAV)", 
      url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmEaCUOX3/LNeSsFIXFx8OqLQAkRUa7i1aVOIQxKm+fzwmEaBEOS3vLQfC4FHm3r8OyLRwkOSKrj1qVOIgxKm+fzwWFaCUOQ3vLQfC4FHm3r8OyLRAkOSKLj1qRPIgxJm+j1wmE0YKDx5Ni7nzMDAQEAA",
      fallback: "",
      format: "WAV"
    }
  ];

  /**
   * Unified radio playback method - handles all playback scenarios
   * @param options Playback configuration options
   */
  async function playRadio(options: {
    url?: string;
    retryWithFallback?: boolean;
    immediate?: boolean; // For user interaction contexts
  } = {}) {
    userHasInteracted = true; // Track user interaction
    
    const playbackUrl = options.url || radioUrl.trim();
    if (!playbackUrl) {
      console.log("Radio Error: Please enter a radio stream URL");
      return false;
    }

    // Stop current playback first with proper cleanup (without changing session ID)
    await stopRadio(true); // Force stop with cleanup
    
    // Generate new playback session ID AFTER stopping previous playback
    currentPlaybackId++;
    const sessionId = currentPlaybackId;
    
    console.log(`Starting playback session ${sessionId}`, { 
      url: playbackUrl, 
      retry: options.retryWithFallback,
      immediate: options.immediate 
    });
    
    // Small delay unless immediate playback requested
    if (!options.immediate) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if this session is still active after delay
      if (sessionId !== currentPlaybackId) {
        console.log(`Playback session ${sessionId} cancelled during delay`);
        return false;
      }
    }

    try {
      const url = await resolveStreamUrl(playbackUrl, options.retryWithFallback);
      console.log(`Session ${sessionId}: Attempting to play:`, url);
      
      // Create new audio element with proper configuration
      audioElement = new Audio();
      audioElement.volume = volume / 100;
      audioElement.preload = "metadata";
      audioElement.crossOrigin = "anonymous";
      
      // Set up event listeners with session tracking
      setupAudioEventListeners(options.retryWithFallback || false, sessionId);
      
      // Set initial state
      currentStation = options.retryWithFallback ? "Trying fallback..." : "Connecting...";
      streamInfo = { title: "Loading...", format: getAudioFormat(url) };
      
      // Set source and load
      audioElement.src = url;
      audioElement.load();
      
      // Add a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        if (audioElement && !isPlaying && sessionId === currentPlaybackId) {
          console.log(`Session ${sessionId}: Connection timeout`);
          handlePlayError(new Error('Connection timeout'), options.retryWithFallback, sessionId);
        }
      }, 10000); // 10 second timeout
      
      // Check if session is still active before playing
      if (sessionId !== currentPlaybackId) {
        clearTimeout(timeoutId);
        console.log(`Session ${sessionId}: Cancelled before play`);
        return false;
      }
      
      // Try to play with proper error handling
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        try {
          await playPromise;
          
          // Final check after async operation
          if (sessionId !== currentPlaybackId) {
            clearTimeout(timeoutId);
            console.log(`Session ${sessionId}: Cancelled after play`);
            if (audioElement) audioElement.pause();
            return false;
          }
          
          clearTimeout(timeoutId);
          isPlaying = true;
          console.log(`Session ${sessionId}: Playback started successfully`);
          return true;
        } catch (error) {
          clearTimeout(timeoutId);
          if (sessionId === currentPlaybackId) {
            return handlePlayError(error, options.retryWithFallback, sessionId);
          }
          return false;
        }
      }
      
      return true;

    } catch (error) {
      console.error(`Session ${sessionId}: Radio setup error:`, error);
      if (sessionId === currentPlaybackId) {
        return handlePlayError(error, options.retryWithFallback, sessionId);
      }
      return false;
    }
  }

  /**
   * Set up audio event listeners with session tracking and proper cleanup
   * @param isRetry Whether this is a retry attempt
   * @param sessionId Current playback session ID
   */
  function setupAudioEventListeners(isRetry: boolean = false, sessionId: number = 0) {
    if (!audioElement) return;
    
    console.log(`Setting up event listeners for session ${sessionId}`);
    
    // Clean up any existing event handlers
    activeEventHandlers.clear();
    
    // loadstart event
    const onLoadStart = () => {
      if (sessionId === currentPlaybackId) {
        currentStation = isRetry ? "Retrying..." : "Loading...";
        console.log(`Session ${sessionId}: Load started`);
      }
    };
    audioElement.addEventListener('loadstart', onLoadStart);
    activeEventHandlers.set('loadstart', onLoadStart);
    
    // canplay event
    const onCanPlay = () => {
      if (sessionId === currentPlaybackId) {
        currentStation = getStationName(radioUrl) || "Unknown Station";
        streamInfo = {
          title: "Live Stream",
          bitrate: "Unknown",
          format: getAudioFormat(radioUrl)
        };
        
        console.log(`Session ${sessionId}: Can play, setting up audio analysis`);
        // Only setup audio analysis if not already done
        if (!isAudioAnalysisSetup) {
          setupAudioAnalysis();
        } else {
          console.log(`Session ${sessionId}: Audio analysis already setup, skipping`);
        }
      }
    };
    audioElement.addEventListener('canplay', onCanPlay);
    activeEventHandlers.set('canplay', onCanPlay);
    
    // error event
    const onError = (e) => {
      if (sessionId === currentPlaybackId) {
        const error = e.target?.error;
        console.error(`Session ${sessionId}: Audio error:`, error);
        handleAudioError(error, isRetry, sessionId);
      }
    };
    audioElement.addEventListener('error', onError);
    activeEventHandlers.set('error', onError);
    
    // ended event
    const onEnded = () => {
      if (sessionId === currentPlaybackId) {
        console.log(`Session ${sessionId}: Stream ended`);
        resetPlayerState();
      }
    };
    audioElement.addEventListener('ended', onEnded);
    activeEventHandlers.set('ended', onEnded);
    
    // abort event
    const onAbort = () => {
      if (sessionId === currentPlaybackId) {
        console.log(`Session ${sessionId}: Audio loading aborted`);
        if (!isRetry) {
          console.log(`Session ${sessionId}: Attempting fallback after abort`);
          setTimeout(() => {
            if (sessionId === currentPlaybackId) {
              playRadio({ retryWithFallback: true });
            }
          }, 1000);
        } else {
          resetPlayerState();
        }
      }
    };
    audioElement.addEventListener('abort', onAbort);
    activeEventHandlers.set('abort', onAbort);
    
    // stalled event
    const onStalled = () => {
      if (sessionId === currentPlaybackId) {
        console.warn(`Session ${sessionId}: Audio stream stalled, trying to recover...`);
      }
    };
    audioElement.addEventListener('stalled', onStalled);
    activeEventHandlers.set('stalled', onStalled);
    
    // waiting event
    const onWaiting = () => {
      if (sessionId === currentPlaybackId) {
        console.log(`Session ${sessionId}: Audio buffering...`);
      }
    };
    audioElement.addEventListener('waiting', onWaiting);
    activeEventHandlers.set('waiting', onWaiting);
  }
  
  async function resolveStreamUrl(url: string, useFallback: boolean = false): Promise<string> {
    // Find the stream object for fallback support
    const streamObj = popularStreams.find(s => s.url === url || s.fallback === url);
    
    if (useFallback && streamObj?.fallback) {
      console.log('Using fallback URL:', streamObj.fallback);
      return streamObj.fallback;
    }
    
    // Handle playlist files by converting to direct streams
    if (url.includes('.m3u') && !useFallback) {
      try {
        if (url.includes('srg-ssr.ch')) {
          return url.replace('.m3u', '');
        }
      } catch (e) {
        console.warn('Could not resolve M3U URL:', e);
      }
    }
    
    if (url.includes('.pls') && !useFallback) {
      try {
        if (url.includes('somafm.com')) {
          // Convert SomaFM PLS to direct stream
          const streamName = url.split('/').pop()?.replace('.pls', '');
          if (streamName) {
            return `https://ice1.somafm.com/${streamName}-256-mp3`;
          }
        }
      } catch (e) {
        console.warn('Could not resolve PLS URL:', e);
      }
    }
    
    return url;
  }
  
  /**
   * Handle playback errors with retry logic and session validation
   * @param error The error that occurred
   * @param wasRetry Whether this was already a retry attempt
   * @param sessionId The session ID this error belongs to
   * @returns Promise<boolean> indicating if error was handled successfully
   */
  async function handlePlayError(error: any, wasRetry: boolean = false, sessionId: number = 0): Promise<boolean> {
    console.error(`Session ${sessionId}: Play error:`, error);
    
    // Check if this error is for the current active session
    if (sessionId !== currentPlaybackId) {
      console.log(`Session ${sessionId}: Ignoring error for cancelled session`);
      return false;
    }
    
    let userMessage = "Failed to play stream: ";
    let shouldRetry = false;
    
    if (error.name === 'NotAllowedError') {
      userMessage += "Browser requires user interaction to play audio. Please click the Play button manually.";
    } else if (error.name === 'NotSupportedError') {
      userMessage += "This audio format is not supported by your browser.";
      shouldRetry = !wasRetry;
    } else if (error.name === 'AbortError') {
      userMessage += "Playback was interrupted.";
      shouldRetry = !wasRetry;
    } else if (error.message?.includes('timeout')) {
      userMessage += "Connection timed out.";
      shouldRetry = !wasRetry;
    } else {
      userMessage += error.message || "Network or stream error occurred.";
      shouldRetry = !wasRetry;
    }
    
    // Try fallback URL if this was the first attempt and session is still active
    if (shouldRetry && sessionId === currentPlaybackId) {
      console.log(`Session ${sessionId}: Attempting fallback stream...`);
      setTimeout(async () => {
        // Only retry if this is still the current active session
        if (sessionId === currentPlaybackId) {
          await playRadio({ retryWithFallback: true });
        } else {
          console.log(`Session ${sessionId}: Retry cancelled, newer session active`);
        }
      }, 1500);
      return true;
    }
    
    console.log(`Session ${sessionId}: Radio Play Error:`, userMessage + (wasRetry ? " (Fallback also failed)" : ""));
    
    // Only reset if this session is still active
    if (sessionId === currentPlaybackId) {
      resetPlayerState();
    }
    
    return false;
  }
  
  /**
   * Handle audio element errors with session validation
   * @param error The media error that occurred
   * @param wasRetry Whether this was already a retry attempt
   * @param sessionId The session ID this error belongs to
   */
  async function handleAudioError(error: any, wasRetry: boolean = false, sessionId: number = 0) {
    // Check if this error is for the current active session
    if (sessionId !== 0 && sessionId !== currentPlaybackId) {
      console.log(`Session ${sessionId}: Ignoring media error for cancelled session`);
      return;
    }
    
    let userMessage = "Stream error: ";
    let shouldRetry = false;
    
    if (error) {
      switch (error.code) {
        case 1:
          userMessage += "Loading was aborted.";
          shouldRetry = !wasRetry;
          break;
        case 2:
          userMessage += "Network error - check your connection.";
          shouldRetry = !wasRetry;
          break;
        case 3:
          userMessage += "Audio format decode error.";
          shouldRetry = !wasRetry;
          break;
        case 4:
          userMessage += "Stream source not found or not accessible.";
          shouldRetry = !wasRetry;
          break;
        default:
          userMessage += "Unknown media error occurred.";
      }
    } else {
      userMessage += "Unable to load stream.";
    }
    
    // Try fallback URL if this was the first attempt and session is still active
    if (shouldRetry && sessionId === currentPlaybackId) {
      console.log(`Session ${sessionId}: Media error, attempting fallback stream...`);
      setTimeout(async () => {
        // Only retry if this is still the current active session
        if (sessionId === currentPlaybackId) {
          await playRadio({ retryWithFallback: true });
        } else {
          console.log(`Session ${sessionId}: Media retry cancelled, newer session active`);
        }
      }, 2000);
      return;
    }
    
    console.log(`Session ${sessionId}: Radio Media Error:`, userMessage + (wasRetry ? " (Fallback also failed)" : ""));
    
    // Only reset if this session is still active
    if (sessionId === currentPlaybackId) {
      resetPlayerState();
    }
  }
  
  function resetPlayerState() {
    isPlaying = false;
    currentStation = "";
    streamInfo = {};
    isRetrying = false;
    retryCount = 0;
    lastAttemptedUrl = "";
    // Don't reset consecutiveFailures and isBlocked here to maintain circuit breaker state
  }

  /**
   * Stop radio playback with comprehensive cleanup
   * @param force Force immediate stop without delay
   */
  async function stopRadio(force: boolean = false): Promise<void> {
    userHasInteracted = true; // Track user interaction
    
    // Prevent multiple concurrent cleanup operations
    if (isCleaningUp && !force) {
      console.log('Cleanup already in progress, skipping duplicate stop request');
      return;
    }
    
    isCleaningUp = true;
    
    console.log(`Stopping radio playback`);
    
    try {
      // Stop and cleanup audio element
      if (audioElement) {
        // Remove all event listeners to prevent conflicts
        const events = ['play', 'pause', 'ended', 'error', 'canplay', 'loadstart', 'stalled', 'waiting', 'abort'];
        events.forEach(event => {
          if (activeEventHandlers.has(event)) {
            audioElement.removeEventListener(event, activeEventHandlers.get(event)!);
            activeEventHandlers.delete(event);
          }
        });
        
        // Disconnect audio source if exists
        if (currentAudioSource) {
          try {
            currentAudioSource.disconnect();
            console.log('Audio source disconnected');
          } catch (e) {
            console.warn('Error disconnecting audio source:', e);
          }
          currentAudioSource = null;
        }
        
        // Stop playback
        audioElement.pause();
        audioElement.src = "";
        audioElement.load(); // Reset element state
        
        console.log('Audio element cleaned up');
        audioElement = null;
        isAudioAnalysisSetup = false;
      }
      
      // Disconnect from Butterchurn
      if (typeof window !== 'undefined' && window.connectButterchurnAudio) {
        window.connectButterchurnAudio(null);
      }
      
      // Clear any remaining event handlers
      activeEventHandlers.clear();
      
      // Reset player state
      resetPlayerState();
      
      console.log('Radio playback stopped and cleaned up');
    } catch (error) {
      console.error('Error during radio cleanup:', error);
    } finally {
      isCleaningUp = false;
    }
  }

  function updateVolume() {
    if (audioElement) {
      audioElement.volume = volume / 100;
    }
  }

  async function handlePlayStopClick() {
    console.log('🎵 handlePlayStopClick called, isPlaying:', isPlaying);
    userHasInteracted = true; // Ensure user interaction tracking
    
    if (isPlaying) {
      await stopRadio();
    } else {
      // Use immediate playback for user interaction
      await playRadio({ immediate: true });
    }
  }
  
  // Removed playRadioWithUserInteraction - now using unified playRadio method
  
  // Removed setupAudioEventListenersForElement - now using unified setupAudioEventListeners
  
  // Removed setupAudioAnalysisForElement - now using unified setupAudioAnalysis
  
  async function handlePresetClick(stream: { name: string, url: string, fallback?: string, format: string }) {
    userHasInteracted = true; // Ensure user interaction is tracked
    
    console.log('Preset clicked:', stream.name);
    
    // Reset circuit breaker when user manually selects a new station
    consecutiveFailures = 0;
    isBlocked = false;
    
    // Set new URL immediately
    radioUrl = stream.url;
    
    // Use unified playback method with immediate start and station URL
    await playRadio({ 
      url: stream.url, 
      immediate: true 
    });
  }

  function getStationName(url: string): string {
    const preset = popularStreams.find(s => s.url === url);
    if (preset) return preset.name;
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '').split('.')[0].toUpperCase();
    } catch {
      return "Radio Station";
    }
  }

  /**
   * Set up audio analysis with singleton AudioContext management
   */
  async function setupAudioAnalysis() {
    if (!audioElement) {
      console.log('No audio element available for analysis setup');
      return;
    }
    
    // Prevent multiple setups for the same element
    if (isAudioAnalysisSetup && currentAudioSource) {
      console.log('Audio analysis already setup for current element');
      return;
    }
    
    try {
      // Use global shared AudioContext from the main page to prevent conflicts
      if (typeof window !== 'undefined' && window.sharedAudioContext) {
        audioContext = window.sharedAudioContext;
        console.log('Using shared AudioContext from global scope');
      } else if (!audioContext || audioContext.state === 'closed') {
        console.log('Creating new AudioContext for audio analysis');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Store as global shared context
        if (typeof window !== 'undefined') {
          window.sharedAudioContext = audioContext;
        }
      }
      
      // Resume context if suspended (autoplay policy)
      if (audioContext.state === 'suspended') {
        console.log('Resuming suspended AudioContext');
        await audioContext.resume();
      }
      
      // Create audio source from element (only once per element)
      try {
        currentAudioSource = audioContext.createMediaElementSource(audioElement);
        console.log('Created MediaElementSource for audio analysis');
      } catch (error) {
        if (error.message.includes('already connected') || error.message.includes('already associated')) {
          console.log('Audio element already has a source node, skipping source creation');
          isAudioAnalysisSetup = true;
          return;
        }
        throw error;
      }
      
      currentAudioSource.connect(audioContext.destination);
      
      // Initialize audio pipeline with compressor if available
      let finalSource = currentAudioSource;
      if (typeof window !== 'undefined' && window.initializeAudioPipeline) {
        finalSource = window.initializeAudioPipeline(audioContext, currentAudioSource) || currentAudioSource;
        console.log('Audio pipeline with compressor initialized');
      }
      
      // Connect to Butterchurn like breakcorn.ru
      if (typeof window !== 'undefined' && window.connectButterchurnAudio) {
        window.connectButterchurnAudio(finalSource);
        console.log('Audio source connected to Butterchurn');
      }
      
      isAudioAnalysisSetup = true;
      console.log('Audio analysis setup completed successfully');
    } catch (error) {
      console.warn('Failed to setup audio analysis:', error);
      isAudioAnalysisSetup = false;
    }
  }
  
  // Removed handleAudioPlayError - now using unified handlePlayError
  
  function getAudioFormat(url: string): string {
    if (url.includes('.mp3') || url.includes('mp3')) return 'MP3';
    if (url.includes('.aac') || url.includes('aac')) return 'AAC';
    if (url.includes('.ogg') || url.includes('ogg')) return 'OGG';
    if (url.includes('.m3u') || url.includes('m3u')) return 'M3U Playlist';
    if (url.includes('.pls') || url.includes('pls')) return 'PLS Playlist';
    if (url.includes('icecast') || url.includes('shoutcast')) return 'Streaming';
    return 'Audio Stream';
  }



  // Update volume when slider changes
  // Audio event handlers
  function setupAudioEventHandlers() {
    if (!audioElement) return;
    
    audioElement.addEventListener('play', () => {
      console.log('Audio: play event');
      isPlaying = true;
    });
    
    audioElement.addEventListener('pause', () => {
      console.log('Audio: pause event');
      if (!isRetrying) {
        isPlaying = false;
      }
    });
    
    audioElement.addEventListener('ended', () => {
      console.log('Audio: ended event - stream ended');
      isPlaying = false;
    });
    
    audioElement.addEventListener('error', (e) => {
      console.error('Audio: error event', audioElement?.error);
      isPlaying = false;
    });
    
    audioElement.addEventListener('loadstart', () => {
      console.log('Audio: loadstart - started loading');
    });
    
    audioElement.addEventListener('canplay', () => {
      console.log('Audio: canplay - can start playing');
      retryCount = 0;
      consecutiveFailures = 0;
    });
    
    audioElement.addEventListener('stalled', () => {
      console.warn('Audio: stalled - data stopped loading');
    });
    
    audioElement.addEventListener('suspend', () => {
      console.warn('Audio: suspend - loading suspended by user agent');
    });
    
    audioElement.addEventListener('abort', () => {
      console.warn('Audio: abort - loading aborted');
    });
    
    audioElement.addEventListener('waiting', () => {
      console.log('Audio: waiting - buffering more data');
    });
  }

  $effect(() => {
    updateVolume();
  });
</script>

<div class="radio-player">
  <div class="player-container">
    <div class="player-header">
      <h2>📻 Internet Radio Player</h2>
      <p class="player-description">Stream live radio stations from around the world</p>
    </div>

    <div class="url-input-section">
      <div class="radio-url-row">
        <input 
            type="url" 
            bind:value={radioUrl} 
            placeholder="Enter radio stream URL (e.g., http://stream.example.com:8000/live)" 
            class="radio-url-input"
            onkeydown={(e) => e.key === 'Enter' && handlePlayStopClick()}
          />
        <!-- Single Play/Stop button like breakcorn.ru -->
        <button 
          onclick={handlePlayStopClick} 
          disabled={!radioUrl.trim() || isRetrying || isBlocked} 
          class="play-stop-button"
          class:playing={isPlaying}
          class:blocked={isBlocked}
          class:retrying={isRetrying}
        >
          {#if isRetrying}
            ⏳ Connecting...
          {:else if isBlocked}
            ⛔ Blocked
          {:else if isPlaying}
            ⏹️ Stop
          {:else}
            ▶️ Play
          {/if}
        </button>
        
        {#if isBlocked}
          <button 
            onclick={() => { consecutiveFailures = 0; isBlocked = false; }} 
            class="reset-button"
          >
            🔄 Reset
          </button>
        {/if}
      </div>
    </div>

    {#if isPlaying && currentStation}
      <div class="now-playing">
        <div class="station-header">
          <h3>🎵 Now Playing:</h3>
          <div class="volume-control">
            <label for="volume-slider">Volume:</label>
            <input 
              id="volume-slider"
              type="range" 
              min="0" 
              max="100" 
              bind:value={volume} 
              oninput={() => userHasInteracted = true}
              class="volume-slider"
            />
            <span class="volume-display">{volume}%</span>
          </div>
        </div>
        
        <div class="station-info">
          <div class="station-name">{currentStation}</div>
          
          {#if Object.keys(streamInfo).length > 0}
            <div class="stream-details">
              {#if streamInfo.title}
                <div class="stream-detail">
                  <span class="detail-label">Title:</span>
                  <span class="detail-value">{streamInfo.title}</span>
                </div>
              {/if}
              {#if streamInfo.format}
                <div class="stream-detail">
                  <span class="detail-label">Format:</span>
                  <span class="detail-value">{streamInfo.format}</span>
                </div>
              {/if}
              {#if streamInfo.bitrate && streamInfo.bitrate !== "Unknown"}
                <div class="stream-detail">
                  <span class="detail-label">Bitrate:</span>
                  <span class="detail-value">{streamInfo.bitrate}</span>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="presets-section">
      <h3>🌐 Radio Stations:</h3>
      <p class="presets-description">Choose from various genres: Lofi, Electronic, Breakcore, PsyTrance, Chillout</p>
      <div class="stream-presets">
        {#each popularStreams as stream}
          <button 
            onclick={() => handlePresetClick(stream)} 
            class="preset-button"
            disabled={isBlocked}
            class:blocked-preset={isBlocked}
            class:current-station={stream.url === radioUrl && isPlaying}
          >
            <div class="preset-header">
              <span class="preset-name">{stream.name}</span>
              <span class="preset-format">{stream.format}</span>
            </div>
            <div class="preset-url">{stream.url}</div>
            {#if stream.fallback}
              <div class="preset-fallback">Fallback: {stream.fallback}</div>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="help-section">
      <details>
        <summary>How to use Internet Radio</summary>
        <div class="help-content">
          <h4>Finding Radio Streams:</h4>
          <ul>
            <li><strong>Direct URLs:</strong> Look for .mp3, .aac, or .ogg stream links</li>
            <li><strong>Playlist Files:</strong> .m3u or .pls files contain stream URLs</li>
            <li><strong>Directories:</strong> Sites like Shoutcast, Icecast, or TuneIn</li>
          </ul>
          
          <h4>Supported Formats:</h4>
          <ul>
            <li>MP3 streams (most common)</li>
            <li>AAC/AAC+ streams</li>
            <li>OGG Vorbis streams</li>
            <li>M3U/PLS playlists</li>
          </ul>
          
          <h4>Tips:</h4>
          <ul>
            <li>Use the preset buttons to test popular stations</li>
            <li>Check your volume level before playing</li>
            <li>Some streams may have geographic restrictions or require CORS support</li>
            <li>If a stream doesn't work, try a different URL</li>
            <li>Browser autoplay policies require the first click by a real user</li>
            <li>HTTPS streams work better in modern browsers</li>
            {#if !userHasInteracted}
              <li><strong>Status:</strong> Click any button above to enable audio playback</li>
            {:else}
              <li><strong>Status:</strong> Audio playback enabled ✓</li>
            {/if}
          </ul>
        </div>
      </details>
    </div>
  </div>
</div>

<style>
  .radio-player {
    padding: 1.5rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  .player-container {
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 12px;
    padding: 2rem;
  }

  .player-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .player-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color, #333333);
    font-size: 1.5rem;
  }

  .player-description {
    color: var(--text-secondary, #666666);
    margin: 0;
  }

  .url-input-section {
    margin-bottom: 2rem;
  }

  .radio-url-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .radio-url-input {
    flex: 1;
    padding: 0 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    min-width: 300px;
    height: 2.4rem;
  }

  .play-stop-button {
    background: var(--success-color, #28a745);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 1.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s;
    white-space: nowrap;
    height: 2.4rem;
    min-width: 140px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .play-stop-button:hover:not(:disabled) {
    background: var(--success-hover, #218838);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  }

  .play-stop-button.playing {
    background: var(--error-color, #dc3545);
    animation: pulse 2s infinite;
  }

  .play-stop-button.playing:hover {
    background: var(--error-hover, #c82333);
  }

  .play-stop-button.retrying {
    background: var(--warning-color, #ffc107);
    color: var(--text-color, #333333);
    animation: pulse 1.5s infinite;
  }

  .play-stop-button.blocked {
    background: var(--error-color, #dc3545);
    animation: none;
  }

  .play-stop-button.blocked:hover {
    background: var(--error-hover, #c82333);
  }

  .play-stop-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  .reset-button {
    background: var(--warning-color, #ffc107);
    color: var(--text-color, #333333);
    border: none;
    border-radius: 8px;
    padding: 0 1.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.25s;
    white-space: nowrap;
    height: 2.4rem;
  }

  .reset-button:hover {
    background: #e0a800;
  }

  .preset-button.blocked-preset {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .now-playing {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .station-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .station-header h3 {
    margin: 0;
    font-size: 1.2rem;
  }

  .volume-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .volume-control label {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .volume-slider {
    width: 100px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .volume-display {
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 40px;
  }

  .station-info {
    text-align: center;
  }

  .station-name {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }

  .stream-details {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .stream-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.8rem;
    opacity: 0.8;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    font-size: 1rem;
    font-weight: 500;
  }

  .presets-section h3 {
    margin-bottom: 0.5rem;
    color: var(--text-color, #333333);
  }

  .presets-description {
    color: var(--text-secondary, #666666);
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .stream-presets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    background: var(--secondary-bg, #f5f5f5);
  }

  .preset-button {
    background: var(--secondary-bg, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.25s;
    text-align: left;
    height: auto;
    min-height: fit-content;
    display: flex;
    flex-direction: column;
  }

  .preset-button:hover:not(:disabled) {
    border-color: var(--primary-color, #007acc);
    background: color-mix(in srgb, var(--primary-color, #007acc) 5%, var(--secondary-bg, #f5f5f5));
  }

  .preset-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .preset-button.current-station {
    border-color: var(--success-color, #28a745);
    background: color-mix(in srgb, var(--success-color, #28a745) 10%, var(--secondary-bg, #f5f5f5));
  }
  
  .preset-button.current-station .preset-name {
    color: var(--success-color, #28a745);
    font-weight: 600;
  }

  .preset-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .preset-name {
    font-weight: 500;
    color: var(--text-color, #333333);
    font-size: 0.9rem;
    flex: 1;
  }

  .preset-format {
    font-size: 0.75rem;
    background: var(--primary-color, #007acc);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-weight: 500;
  }

  .preset-url {
    font-size: 0.7rem;
    color: var(--text-secondary, #666666);
    word-break: break-all;
    margin-bottom: 0.25rem;
    line-height: 1.3;
  }

  .preset-fallback {
    font-size: 0.7rem;
    color: var(--text-secondary, #666666);
    opacity: 0.7;
    word-break: break-all;
  }

  .help-section {
    border-top: 1px solid var(--border-color, #e0e0e0);
    padding-top: 1.5rem;
  }

  .help-section summary {
    cursor: pointer;
    font-weight: 500;
    color: var(--text-color, #333333);
    padding: 0.5rem 0;
  }

  .help-content {
    padding: 1rem 0;
    color: var(--text-secondary, #666666);
  }

  .help-content h4 {
    color: var(--text-color, #333333);
    margin: 1rem 0 0.5rem 0;
  }

  .help-content ul {
    margin-left: 1rem;
    line-height: 1.6;
  }

  .help-content li {
    margin-bottom: 0.25rem;
  }

  @media (max-width: 768px) {
    .radio-player {
      padding: 1rem;
    }

    .player-container {
      padding: 1rem;
    }

    .radio-url-row {
      flex-direction: column;
      align-items: stretch;
    }

    .radio-url-input {
      min-width: unset;
      width: 100%;
      margin-bottom: 0.5rem;
    }

    .station-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .volume-control {
      align-self: stretch;
      justify-content: space-between;
    }

    .volume-slider {
      flex: 1;
      margin: 0 1rem;
    }

    .stream-detail {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .detail-value {
      text-align: left;
    }

    .stream-presets {
      grid-template-columns: 1fr;
    }

    .stream-details {
      justify-content: flex-start;
      gap: 1rem;
    }
  }
</style>