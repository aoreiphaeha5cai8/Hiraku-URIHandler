<script lang="ts">
  let radioUrl = $state("");
  let isPlaying = $state(false);
  let volume = $state(70);
  let currentStation = $state("");
  let streamInfo = $state<{title?: string, bitrate?: string, format?: string}>({});
  let audioElement: HTMLAudioElement | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let audioDataArray: Uint8Array | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let currentSourceIndex = $state(0);
  let currentRequestId = 0; // Track current request to cancel old ones
  let isRetrying = $state(false);
  let retryCount = $state(0);
  let maxRetries = 2;
  let lastAttemptedUrl = $state("");
  let consecutiveFailures = $state(0);
  let isBlocked = $state(false);
  let autoSwitchInterval: number | null = null;

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

  async function playRadio(retryWithFallback: boolean = false) {
    if (!radioUrl.trim()) {
      console.log("Radio Error: Please enter a radio stream URL");
      return;
    }

    // Increment request ID to invalidate previous requests
    currentRequestId++;
    const requestId = currentRequestId;
    
    // Stop current playback first
    if (audioElement) {
      stopRadio();
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
    }
    
    // Check if this request is still valid
    if (requestId !== currentRequestId) {
      console.log('Radio request cancelled (new request started)');
      return;
    }

    try {
      const url = await resolveStreamUrl(radioUrl.trim(), retryWithFallback);
      console.log('Attempting to play:', url);
      
      audioElement = new Audio();
      audioElement.volume = volume / 100;
      audioElement.preload = "metadata";
      audioElement.crossOrigin = "anonymous";
      
      // Set up event listeners before setting src
      setupAudioEventListeners(retryWithFallback, requestId);
      
      // Set initial state
      currentStation = retryWithFallback ? "Trying fallback..." : "Connecting...";
      streamInfo = { title: "Loading...", format: getAudioFormat(url) };
      
      // Set source and load
      audioElement.src = url;
      audioElement.load();
      
      // Add a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        if (audioElement && !isPlaying) {
          handlePlayError(new Error('Connection timeout'));
        }
      }, 10000); // 10 second timeout
      
      // Check if request is still valid before playing
      if (requestId !== currentRequestId) {
        clearTimeout(timeoutId);
        console.log('Radio request cancelled before play');
        return;
      }
      
      // Try to play with proper error handling
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        try {
          await playPromise;
          
          // Check again after async operation
          if (requestId !== currentRequestId) {
            clearTimeout(timeoutId);
            console.log('Radio request cancelled after play');
            if (audioElement) audioElement.pause();
            return;
          }
          
          clearTimeout(timeoutId);
          isPlaying = true;
        } catch (error) {
          clearTimeout(timeoutId);
          if (requestId === currentRequestId) {
            handlePlayError(error, retryWithFallback, requestId);
          }
        }
      }

    } catch (error) {
      console.error('Radio setup error:', error);
      if (requestId === currentRequestId) {
        handlePlayError(error, retryWithFallback, requestId);
      }
    }
  }

  function setupAudioEventListeners(isRetry: boolean = false, requestId: number = 0) {
    if (!audioElement) return;
    
    audioElement.addEventListener('loadstart', () => {
      if (requestId === 0 || requestId === currentRequestId) {
        currentStation = isRetry ? "Retrying..." : "Loading...";
      }
    });
    
    audioElement.addEventListener('canplay', () => {
      if (requestId === 0 || requestId === currentRequestId) {
        currentStation = getStationName(radioUrl) || "Unknown Station";
        streamInfo = {
          title: "Live Stream",
          bitrate: "Unknown",
          format: getAudioFormat(radioUrl)
        };
        
        // Setup audio analysis for Butterchurn
        setupAudioAnalysis();
      }
    });
    
    audioElement.addEventListener('error', (e) => {
      const error = e.target?.error;
      console.error('Audio element error:', error);
      handleAudioError(error, isRetry, requestId);
    });
    
    audioElement.addEventListener('ended', () => {
      console.log('Stream ended');
      if (requestId === 0 || requestId === currentRequestId) {
        resetPlayerState();
      }
    });
    
    audioElement.addEventListener('abort', () => {
      console.log('Audio loading aborted');
      if (requestId === 0 || requestId === currentRequestId) {
        if (!isRetry) {
          // Try fallback on abort
          setTimeout(() => {
            if (requestId === 0 || requestId === currentRequestId) {
              playRadio(true);
            }
          }, 1000);
        } else {
          resetPlayerState();
        }
      }
    });
    
    audioElement.addEventListener('stalled', () => {
      console.warn('Audio stream stalled, trying to recover...');
    });
    
    audioElement.addEventListener('waiting', () => {
      console.log('Audio buffering...');
    });
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
  
  function handlePlayError(error: any, wasRetry: boolean = false, requestId: number = 0) {
    console.error('Play error:', error);
    
    // Check if this error is for the current request
    if (requestId !== currentRequestId) {
      console.log('Ignoring error for cancelled request');
      return;
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
    
    // Try fallback URL if this was the first attempt
    if (shouldRetry) {
      console.log('Attempting fallback stream...');
      setTimeout(() => {
        // Only retry if this is still the current request
        if (requestId === currentRequestId) {
          playRadio(true);
        }
      }, 1500);
      return;
    }
    
    console.log("Radio Play Error:", userMessage + (wasRetry ? " (Fallback also failed)" : ""));
    resetPlayerState();
  }
  
  function handleAudioError(error: any, wasRetry: boolean = false, requestId: number = 0) {
    // Check if this error is for the current request
    if (requestId !== 0 && requestId !== currentRequestId) {
      console.log('Ignoring media error for cancelled request');
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
    
    // Try fallback URL if this was the first attempt and we have a fallback
    if (shouldRetry) {
      console.log('Media error, attempting fallback stream...');
      setTimeout(() => {
        // Only retry if this is still the current request
        if (requestId === 0 || requestId === currentRequestId) {
          playRadio(true);
        }
      }, 2000);
      return;
    }
    
    console.log("Radio Media Error:", userMessage + (wasRetry ? " (Fallback also failed)" : ""));
    resetPlayerState();
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

  function stopRadio() {
    // Stop playback
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.src = ""; // Clear source for streaming
        audioElement.load(); // Reset the audio element
        audioElement = null;
      } catch (e) {
        console.warn('Error stopping audio:', e);
      }
    }
    
    // Clear intervals like breakcorn.ru
    if (autoSwitchInterval) {
      clearInterval(autoSwitchInterval);
      autoSwitchInterval = null;
    }
    
    // Disconnect source node
    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch (e) {
        console.warn('Error disconnecting source node:', e);
      }
      sourceNode = null;
    }
    
    // Clean up audio analysis
    if (audioContext) {
      try {
        audioContext.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
      audioContext = null;
    }
    analyser = null;
    audioDataArray = null;
    
    // Disconnect from Butterchurn
    if (typeof window !== 'undefined' && window.connectButterchurnAudio) {
      window.connectButterchurnAudio(null);
    }
    
    resetPlayerState();
  }

  function updateVolume() {
    if (audioElement) {
      audioElement.volume = volume / 100;
    }
  }

  async function selectPreset(stream: { name: string, url: string, fallback?: string, format: string }) {
    // Reset circuit breaker when user manually selects a new station
    consecutiveFailures = 0;
    isBlocked = false;
    
    // Stop any current playback and cancel pending requests
    stopRadio();
    
    // Set new URL and play
    radioUrl = stream.url;
    await playRadio();
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

  function setupAudioAnalysis() {
    if (!audioElement || audioContext || sourceNode) return;
    
    try {
      // Create audio context like breakcorn.ru
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended (autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create audio source from element like breakcorn
      sourceNode = audioContext.createMediaElementSource(audioElement);
      
      // Initialize audio pipeline with compressor if available
      let finalSource = sourceNode;
      if (typeof window !== 'undefined' && window.initializeAudioPipeline) {
        finalSource = window.initializeAudioPipeline(audioContext, sourceNode) || sourceNode;
        console.log('Audio pipeline with compressor initialized');
      } else {
        // Fallback: direct connection
        sourceNode.connect(audioContext.destination);
      }
      
      // Connect to Butterchurn
      if (typeof window !== 'undefined' && window.connectButterchurnAudio) {
        window.connectButterchurnAudio(finalSource);
        console.log('Audio source connected to Butterchurn');
      }
    } catch (error) {
      console.warn('Failed to setup audio analysis:', error);
    }
  }
  
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
            onkeydown={async (e) => e.key === 'Enter' && await playRadio()}
          />
        <!-- Single Play/Stop button like breakcorn.ru -->
        <button 
          onclick={() => isPlaying ? stopRadio() : playRadio()} 
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
            onclick={async () => await selectPreset(stream)} 
            class="preset-button"
            disabled={isPlaying || isBlocked}
            class:blocked-preset={isBlocked}
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
            <li>Some streams may have geographic restrictions or CORS issues in browser</li>
            <li>If a stream doesn't work, try a different URL</li>
            <li>Browser autoplay policies may require user interaction first</li>
            <li>HTTPS streams work better in modern browsers</li>
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