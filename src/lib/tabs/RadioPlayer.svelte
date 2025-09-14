<script lang="ts">
  let radioUrl = $state("");
  let isPlaying = $state(false);
  let volume = $state(70);
  let currentStation = $state("");
  let streamInfo = $state<{title?: string, bitrate?: string, format?: string}>({});
  let audioElement: HTMLAudioElement | null = null;

  const popularStreams = [
    { name: "BBC Radio 1", url: "http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio1_mf_p" },
    { name: "NPR News", url: "https://nprhome.streamguys1.com/live.mp3" },
    { name: "Classical WQXR", url: "https://stream.wqxr.org/wqxr" },
    { name: "Jazz FM", url: "https://jazzfm.streamguys1.com/live" },
    { name: "Rock FM", url: "https://rockfm.streamguys1.com/live" },
    { name: "Chillout Radio", url: "https://chillout.streamguys1.com/live" }
  ];

  function playRadio() {
    if (!radioUrl.trim()) {
      alert("Please enter a radio stream URL");
      return;
    }

    try {
      if (audioElement) {
        audioElement.pause();
      }

      audioElement = new Audio(radioUrl.trim());
      audioElement.volume = volume / 100;
      
      audioElement.addEventListener('loadstart', () => {
        currentStation = "Loading...";
      });
      
      audioElement.addEventListener('canplay', () => {
        currentStation = getStationName(radioUrl) || "Unknown Station";
        streamInfo = {
          title: "Live Stream",
          bitrate: "Unknown",
          format: getAudioFormat(radioUrl)
        };
      });
      
      audioElement.addEventListener('error', (e) => {
        alert(`Error playing stream: ${e.type}`);
        isPlaying = false;
        currentStation = "";
      });
      
      audioElement.addEventListener('ended', () => {
        isPlaying = false;
      });

      audioElement.play();
      isPlaying = true;
    } catch (error) {
      alert(`Error: ${error}`);
      isPlaying = false;
    }
  }

  function stopRadio() {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    isPlaying = false;
    currentStation = "";
    streamInfo = {};
  }

  function updateVolume() {
    if (audioElement) {
      audioElement.volume = volume / 100;
    }
  }

  function selectPreset(stream: { name: string, url: string }) {
    radioUrl = stream.url;
    playRadio();
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

  function getAudioFormat(url: string): string {
    if (url.includes('.mp3')) return 'MP3';
    if (url.includes('.aac')) return 'AAC';
    if (url.includes('.ogg')) return 'OGG';
    if (url.includes('.m3u')) return 'M3U Playlist';
    if (url.includes('.pls')) return 'PLS Playlist';
    return 'Stream';
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
          onkeydown={(e) => e.key === 'Enter' && playRadio()}
        />
        <button 
          onclick={playRadio} 
          disabled={!radioUrl.trim() || isPlaying} 
          class="play-button"
        >
          {isPlaying ? "⏸️ Playing" : "▶️ Play"}
        </button>
        <button 
          onclick={stopRadio} 
          disabled={!isPlaying} 
          class="stop-button"
        >
          ⏹️ Stop
        </button>
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
      <h3>🌐 Popular Streams:</h3>
      <div class="stream-presets">
        {#each popularStreams as stream}
          <button 
            onclick={() => selectPreset(stream)} 
            class="preset-button"
            disabled={isPlaying}
          >
            <div class="preset-name">{stream.name}</div>
            <div class="preset-url">{stream.url}</div>
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
            <li>Some streams may have geographic restrictions</li>
            <li>If a stream doesn't work, try a different URL</li>
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
    padding: 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    min-width: 300px;
  }

  .play-button {
    background: var(--success-color, #28a745);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.25s;
    white-space: nowrap;
  }

  .play-button:hover:not(:disabled) {
    background: var(--success-hover, #218838);
  }

  .stop-button {
    background: var(--error-color, #dc3545);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.25s;
    white-space: nowrap;
  }

  .stop-button:hover:not(:disabled) {
    background: var(--error-hover, #c82333);
  }

  .play-button:disabled,
  .stop-button:disabled {
    opacity: 0.6;
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
    margin-bottom: 1rem;
    color: var(--text-color, #333333);
  }

  .stream-presets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .preset-button {
    background: var(--secondary-bg, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.25s;
    text-align: left;
  }

  .preset-button:hover:not(:disabled) {
    border-color: var(--primary-color, #007acc);
    background: color-mix(in srgb, var(--primary-color, #007acc) 5%, var(--secondary-bg, #f5f5f5));
  }

  .preset-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .preset-name {
    font-weight: 500;
    color: var(--text-color, #333333);
    margin-bottom: 0.25rem;
  }

  .preset-url {
    font-size: 0.8rem;
    color: var(--text-secondary, #666666);
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