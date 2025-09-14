<script lang="ts">
  import TabNavigation from '../lib/components/TabNavigation.svelte';
  import HttpClient from '../lib/tabs/HttpClient.svelte';
  import NetworkTools from '../lib/tabs/NetworkTools.svelte';
  import RadioPlayer from '../lib/tabs/RadioPlayer.svelte';
  import butterchurn from 'butterchurn';
  import butterchurnPresets from 'butterchurn-presets';

  // Tab state
  let activeTab = $state('http-client');
  let theme = $state<'light' | 'dark' | 'system' | 'butterchurn'>('system');
  
  // Butterchurn state
  let butterchurnCanvas: HTMLCanvasElement | null = null;
  let butterchurnInstance: any = null;
  let animationFrameId: number | null = null;
  let audioAnalyser: AnalyserNode | null = null;
  let audioDataArray: Uint8Array | null = null;
  let isAudioConnected = $state(false);

  // Tab definitions
  const tabs = [
    {
      id: 'http-client',
      name: 'HTTP Client',
      icon: '🌐',
      description: 'Make HTTP requests with custom headers and User-Agent'
    },
    {
      id: 'network-tools',
      name: 'Network Tools',
      icon: '🔧',
      description: 'DNS resolution, WHOIS lookup, IP geolocation, and URL cleaning'
    },
    {
      id: 'radio-player',
      name: 'Radio Player',
      icon: '📻',
      description: 'Stream internet radio stations'
    }
  ];

  function handleTabChange(tabId: string) {
    activeTab = tabId;
  }

  // Theme management
  function applyTheme() {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    // Initialize Butterchurn if selected
    if (theme === 'butterchurn') {
      setTimeout(() => initializeButterchurn(), 100);
    } else {
      cleanupButterchurn();
    }
  }
  
  function initializeButterchurn() {
    console.log('Initializing Butterchurn...');
    
    try {
      // Create canvas if it doesn't exist
      if (!butterchurnCanvas) {
        console.log('Creating Butterchurn canvas...');
        butterchurnCanvas = document.createElement('canvas');
        butterchurnCanvas.style.position = 'fixed';
        butterchurnCanvas.style.top = '0';
        butterchurnCanvas.style.left = '0';
        butterchurnCanvas.style.width = '100vw';
        butterchurnCanvas.style.height = '100vh';
        butterchurnCanvas.style.zIndex = '-1';
        butterchurnCanvas.style.pointerEvents = 'none';
        butterchurnCanvas.style.backgroundColor = 'transparent';
        butterchurnCanvas.width = window.innerWidth;
        butterchurnCanvas.height = window.innerHeight;
        
        // Add canvas with a visible background for debugging
        butterchurnCanvas.style.border = '2px solid red';
        butterchurnCanvas.id = 'butterchurn-canvas';
        
        document.body.appendChild(butterchurnCanvas);
        console.log('Canvas created and appended to body', butterchurnCanvas);
      }
      
      // Create WebGL context
      const gl = butterchurnCanvas.getContext('webgl2') || butterchurnCanvas.getContext('webgl');
      
      if (!gl) {
        console.warn('WebGL not supported, falling back to static background');
        // Create a vibrant static animated background instead
        butterchurnCanvas.style.background = `
          radial-gradient(circle at 20% 80%, rgba(255, 0, 128, 0.6) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.6) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 255, 0, 0.6) 0%, transparent 50%)
        `;
        startStaticAnimation();
        return;
      }
      
      console.log('WebGL context obtained, creating Butterchurn visualizer...');
      
      // Initialize butterchurn
      butterchurnInstance = butterchurn.createVisualizer(
        gl,
        butterchurnCanvas.width,
        butterchurnCanvas.height,
        {
          meshWidth: 64,
          meshHeight: 48,
          fps: 60
        }
      );
      
      console.log('Butterchurn visualizer created:', butterchurnInstance);
      
      // Load a preset
      const presets = butterchurnPresets.getPresets();
      const presetKeys = Object.keys(presets);
      const randomPreset = presets[presetKeys[Math.floor(Math.random() * presetKeys.length)]];
      console.log('Loading preset:', presetKeys[presetKeys.indexOf(Object.keys(randomPreset)[0])]);
      butterchurnInstance.loadPreset(randomPreset, 0.0);
      
      // Start animation loop
      startButterchurnAnimation();
      console.log('Butterchurn animation started');
    } catch (error) {
      console.error('Failed to initialize Butterchurn:', error);
      // Fallback to vibrant static animated background
      if (butterchurnCanvas) {
        console.log('Using fallback static animation');
        butterchurnCanvas.style.background = `
          linear-gradient(45deg, 
            rgba(255, 0, 128, 0.7) 0%, 
            rgba(0, 255, 255, 0.7) 25%,
            rgba(255, 255, 0, 0.7) 50%,
            rgba(128, 0, 255, 0.7) 75%,
            rgba(255, 128, 0, 0.7) 100%)
        `;
        startStaticAnimation();
      }
    }
  }
  
  function startButterchurnAnimation() {
    if (!butterchurnInstance) return;
    
    console.log('Starting Butterchurn animation');
    
    const animate = () => {
      if (theme !== 'butterchurn') return;
      
      try {
        let audioData: Uint8Array;
        
        if (isAudioConnected && audioAnalyser && audioDataArray) {
          // Use real audio data from radio player
          audioAnalyser.getByteFrequencyData(audioDataArray);
          audioData = audioDataArray;
          console.log('Using real audio data, avg level:', audioDataArray.reduce((a, b) => a + b) / audioDataArray.length);
        } else {
          // Generate more dynamic fake audio data as fallback
          audioData = new Uint8Array(1024);
          const time = Date.now() * 0.001;
          for (let i = 0; i < 1024; i++) {
            audioData[i] = 
              Math.sin(time * 2 + i * 0.05) * 60 +
              Math.sin(time * 0.5 + i * 0.02) * 40 +
              Math.random() * 20 + 90;
          }
        }
        
        // Use same data for both time and frequency domain
        butterchurnInstance.render(audioData, audioData);
        animationFrameId = requestAnimationFrame(animate);
      } catch (error) {
        console.error('Butterchurn render error:', error);
        // Fall back to static animation on error
        startStaticAnimation();
      }
    };
    
    animate();
  }
  
  function startStaticAnimation() {
    let hue = 0;
    console.log('Starting static animation fallback');
    
    const animate = () => {
      if (theme !== 'butterchurn' || !butterchurnCanvas) return;
      
      hue = (hue + 2) % 360;
      
      // More dynamic animation that responds to audio if available
      let intensity = 1;
      if (isAudioConnected && audioAnalyser && audioDataArray) {
        audioAnalyser.getByteFrequencyData(audioDataArray);
        // Calculate average intensity from audio
        const sum = audioDataArray.reduce((a, b) => a + b, 0);
        intensity = 1 + (sum / audioDataArray.length) / 64; // More sensitive
      }
      
      const time = Date.now() * 0.002; // Faster animation
      butterchurnCanvas.style.background = `
        radial-gradient(circle at ${50 + 40 * intensity * Math.sin(time)}% ${50 + 30 * intensity * Math.cos(time * 1.5)}%, 
                       hsla(${hue}, 90%, ${60 + intensity * 20}%, ${0.6 + intensity * 0.2}) 0%, transparent 70%),
        radial-gradient(circle at ${50 + 30 * intensity * Math.cos(time * 1.3)}% ${50 + 40 * intensity * Math.sin(time * 1.1)}%, 
                       hsla(${(hue + 120) % 360}, 90%, ${60 + intensity * 20}%, ${0.6 + intensity * 0.2}) 0%, transparent 70%),
        radial-gradient(circle at ${50 + 35 * intensity * Math.sin(time * 0.8)}% ${50 + 35 * intensity * Math.cos(time * 2.1)}%, 
                       hsla(${(hue + 240) % 360}, 90%, ${60 + intensity * 20}%, ${0.6 + intensity * 0.2}) 0%, transparent 70%),
        linear-gradient(${hue}deg, 
                       hsla(${hue}, 50%, 30%, 0.1) 0%, 
                       hsla(${(hue + 60) % 360}, 50%, 30%, 0.1) 50%,
                       hsla(${(hue + 120) % 360}, 50%, 30%, 0.1) 100%)
      `;
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  function cleanupButterchurn() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    if (butterchurnInstance) {
      try {
        butterchurnInstance.destroy();
      } catch (e) {
        console.warn('Error destroying Butterchurn instance:', e);
      }
      butterchurnInstance = null;
    }
    
    if (butterchurnCanvas) {
      butterchurnCanvas.remove();
      butterchurnCanvas = null;
    }
  }

  // Apply theme on mount and when theme changes
  $effect(() => {
    applyTheme();
  });

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme === 'system') {
        applyTheme();
      }
    });
    
    // Handle window resize for Butterchurn
    window.addEventListener('resize', () => {
      if (theme === 'butterchurn' && butterchurnCanvas && butterchurnInstance) {
        butterchurnCanvas.width = window.innerWidth;
        butterchurnCanvas.height = window.innerHeight;
        butterchurnInstance.setRendererSize(window.innerWidth, window.innerHeight);
      }
    });
    
    // Setup global function for audio analyzer connection
    window.setAudioAnalyzer = (analyser: AnalyserNode | null, dataArray: Uint8Array | null) => {
      audioAnalyser = analyser;
      audioDataArray = dataArray;
      isAudioConnected = !!analyser;
      console.log('Audio analyzer', analyser ? 'connected' : 'disconnected');
    };
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupButterchurn);
  }
</script>

<svelte:head>
  <title>HTTP Client - Network Tools</title>
  <meta name="description" content="Advanced HTTP client with DNS tools, WHOIS lookup, IP geolocation, and internet radio player" />
</svelte:head>

<div class="app-container">
  <header class="app-header">
    <div class="header-content">
      <div class="app-title">
        <h1>🚀 Network Toolkit</h1>
        <p class="app-subtitle">Professional HTTP client and network utilities</p>
      </div>
      
      <div class="theme-selector">
        <label for="theme-select">Theme:</label>
        <select id="theme-select" bind:value={theme} class="theme-select">
          <option value="system">🖥️ System</option>
          <option value="light">☀️ Light</option>
          <option value="dark">🌙 Dark</option>
          <option value="butterchurn">🌈 Butterchurn</option>
        </select>
      </div>
    </div>
  </header>

  <TabNavigation {tabs} {activeTab} onTabChange={handleTabChange} />

  <main class="app-main">
    {#if activeTab === 'http-client'}
      <HttpClient />
    {:else if activeTab === 'network-tools'}
      <NetworkTools />
    {:else if activeTab === 'radio-player'}
      <RadioPlayer />
    {/if}
  </main>

  <footer class="app-footer">
    <p>Built with ❤️ using Tauri, SvelteKit, and Rust</p>
  </footer>
</div>

<style>
  :global(:root) {
    /* Light theme variables */
    --primary-color: #007acc;
    --primary-hover: #005fa3;
    --success-color: #28a745;
    --success-hover: #218838;
    --success-bg: #d4edda;
    --error-color: #dc3545;
    --error-hover: #c82333;
    --warning-color: #ffc107;
    --info-bg: #e3f2fd;
    --text-color: #333333;
    --text-secondary: #666666;
    --bg-color: #ffffff;
    --card-bg: #ffffff;
    --input-bg: #ffffff;
    --secondary-bg: #f5f5f5;
    --border-color: #e0e0e0;
    --hover-bg: #f5f5f5;
    --code-bg: #f8f9fa;
    --shadow: rgba(0, 0, 0, 0.1);
  }

  :global([data-theme="dark"]) {
    /* Dark theme variables */
    --primary-color: #4fc3f7;
    --primary-hover: #29b6f6;
    --success-color: #66bb6a;
    --success-hover: #4caf50;
    --success-bg: #1b4332;
    --error-color: #ef5350;
    --error-hover: #f44336;
    --warning-color: #ffca28;
    --info-bg: #0d47a1;
    --text-color: #e0e0e0;
    --text-secondary: #b0b0b0;
    --bg-color: #121212;
    --card-bg: #1e1e1e;
    --input-bg: #2d2d2d;
    --secondary-bg: #2d2d2d;
    --border-color: #404040;
    --hover-bg: #2d2d2d;
    --code-bg: #2d2d2d;
    --shadow: rgba(0, 0, 0, 0.3);
  }

  :global([data-theme="butterchurn"]) {
    /* Butterchurn glassmorphism theme */
    --primary-color: #4fc3f7;
    --primary-hover: rgba(79, 195, 247, 0.9);
    --success-color: #00ff88;
    --success-hover: rgba(0, 255, 136, 0.9);
    --success-bg: rgba(0, 255, 136, 0.1);
    --error-color: #ff4081;
    --error-hover: rgba(255, 64, 129, 0.9);
    --warning-color: #ffeb3b;
    --info-bg: rgba(33, 150, 243, 0.1);
    --text-color: rgba(255, 255, 255, 0.95);
    --text-secondary: rgba(255, 255, 255, 0.8);
    --bg-color: transparent;
    --card-bg: rgba(0, 0, 0, 0.4);
    --input-bg: rgba(0, 0, 0, 0.3);
    --secondary-bg: rgba(0, 0, 0, 0.35);
    --border-color: rgba(255, 255, 255, 0.3);
    --hover-bg: rgba(0, 0, 0, 0.5);
    --code-bg: rgba(0, 0, 0, 0.6);
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    --glass-backdrop: blur(8px);
    --glass-border: rgba(255, 255, 255, 0.2);
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: var(--bg-color);
    color: var(--text-color);
    margin: 0;
    padding: 0;
    line-height: 1.6;
    transition: background-color 0.25s, color 0.25s;
    position: relative;
    overflow-x: hidden;
  }

  /* Butterchurn background canvas should be fully visible */
  :global([data-theme="butterchurn"] #butterchurn-canvas) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    filter: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    z-index: -1 !important;
  }

  :global([data-theme="butterchurn"] .app-header),
  :global([data-theme="butterchurn"] .app-main),
  :global([data-theme="butterchurn"] .app-footer) {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow);
  }

  :global([data-theme="butterchurn"] input),
  :global([data-theme="butterchurn"] select),
  :global([data-theme="butterchurn"] button) {
    background: rgba(0, 0, 0, 0.3) !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    color: rgba(255, 255, 255, 0.95) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  :global([data-theme="butterchurn"] input:focus),
  :global([data-theme="butterchurn"] select:focus),
  :global([data-theme="butterchurn"] button:hover) {
    background: rgba(0, 0, 0, 0.5) !important;
    border: 1px solid rgba(255, 255, 255, 0.5) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }

  :global(h1, h2, h3, h4, h5, h6) {
    margin: 0;
    line-height: 1.2;
  }

  :global(input, select, textarea, button) {
    font-family: inherit;
    transition: all 0.25s;
    height: 2.4rem;
    box-sizing: border-box;
  }

  /* Override height for textarea to allow flexible height */
  :global(textarea) {
    height: auto;
    min-height: 2.4rem;
  }

  /* Override height for preset buttons to allow adaptive height */
  :global(.preset-button) {
    height: auto !important;
    min-height: fit-content !important;
  }

  :global(select) {
    background: var(--input-bg) !important;
    color: var(--text-color) !important;
    border: 1px solid var(--border-color) !important;
    /* Webkit specific styles */
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666666'><path d='M7 10l5 5 5-5z'/></svg>") !important;
    background-repeat: no-repeat !important;
    background-position: right 8px center !important;
    background-size: 20px !important;
    padding-right: 35px !important;
  }

  :global([data-theme="dark"] select) {
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23b0b0b0'><path d='M7 10l5 5 5-5z'/></svg>") !important;
  }

  :global(select option) {
    background: var(--input-bg) !important;
    color: var(--text-color) !important;
    padding: 8px 12px !important;
  }

  :global(select:focus) {
    outline: 2px solid var(--primary-color) !important;
    outline-offset: 2px;
    border-color: var(--primary-color) !important;
  }

  :global(select:hover) {
    border-color: var(--primary-color) !important;
  }

  :global(input:focus, select:focus, textarea:focus) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  :global(button:focus) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  :global(::selection) {
    background: var(--primary-color);
    color: white;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-color);
  }

  .app-header {
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 0;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.5rem;
  }

  .app-title h1 {
    color: var(--text-color);
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .app-subtitle {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;
  }

  .theme-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .theme-selector label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .theme-select {
    padding: 0 2rem 0 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 0.9rem;
    cursor: pointer;
    min-width: 120px;
    height: 2.4rem;
    /* Remove default styling */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    /* Custom arrow */
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666666'><path d='M7 10l5 5 5-5z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 16px;
  }

  :global([data-theme="dark"]) .theme-select {
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23b0b0b0'><path d='M7 10l5 5 5-5z'/></svg>");
  }

  .theme-select:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-color: var(--primary-color);
  }

  .theme-select:hover {
    border-color: var(--primary-color);
  }

  .theme-select option {
    background: var(--input-bg);
    color: var(--text-color);
    padding: 8px 12px;
  }

  .app-main {
    flex: 1;
    background: var(--bg-color);
    min-height: calc(100vh - 200px);
  }

  .app-footer {
    background: var(--card-bg);
    border-top: 1px solid var(--border-color);
    padding: 1rem;
    text-align: center;
  }

  .app-footer p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
      padding: 0 1rem;
    }

    .app-title {
      text-align: center;
    }

    .app-title h1 {
      font-size: 1.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*) {
      transition: none !important;
      animation: none !important;
    }
  }
</style>