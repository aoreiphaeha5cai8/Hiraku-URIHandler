<script lang="ts">
  import TabNavigation from '../lib/components/TabNavigation.svelte';
  import HttpClient from '../lib/tabs/HttpClient.svelte';
  import NetworkTools from '../lib/tabs/NetworkTools.svelte';
  import RadioPlayer from '../lib/tabs/RadioPlayer.svelte';
  import SettingsModal from '../lib/components/SettingsModal.svelte';
  
  // Dynamic imports for Butterchurn to avoid SSR issues
  let butterchurnModule: any = null;
  let butterchurnPresetsModule: any = null;
  
  // Butterchurn preset management like breakcorn.ru
  let presets: any = {};
  let presetKeys: string[] = $state([]);
  let presetIndex = $state(0);
  let presetIndexHistory: number[] = [];
  let presetCycle = $state(true);
  let presetCycleLength = $state(15);
  let presetRandom = $state(true);
  let cycleInterval: number | null = null;
  let defaultBlendTime = 5.7;

  // Tab state
  let activeTab = $state('http-client');
  let theme = $state<'light' | 'dark' | 'system' | 'plum' | 'blur' | 'butterchurn'>('system');
  
  // Audio context globals
  let sharedAudioContext: AudioContext | null = null;
  let audioAnalyser: AnalyserNode | null = null;
  let audioDataArray: Uint8Array | null = null;
  
  // Butterchurn state (following breakcorn.ru pattern)
  let butterchurnCanvas: HTMLCanvasElement | null = null;
  let butterchurnVisualizer: any = $state(null);
  let animationFrameId: number | null = null;
  let audioSource: MediaElementAudioSourceNode | null = null;
  let isAudioConnected = $state(false);
  let isRendering = $state(false);
  let isInitializing = false;
  
  // Settings modal
  let settingsModal: SettingsModal;

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
    console.log('Tab change requested:', tabId, 'current:', activeTab);
    activeTab = tabId;
    console.log('Tab changed to:', activeTab);
  }
  
  function handleSettingsClick() {
    settingsModal?.openModal();
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
      setTimeout(async () => await initializeButterchurn(), 100);
    } else {
      cleanupButterchurn();
    }
    
    // Handle blur theme with dynamic blur animation
    if (theme === 'blur') {
      setTimeout(() => startBlurAnimation(), 100);
    }
  }
  
  async function initializeButterchurn() {
    if (isInitializing || butterchurnVisualizer) {
      console.log('Butterchurn already initializing or initialized, skipping...');
      return;
    }
    
    isInitializing = true;
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
      
      // Create or reuse shared AudioContext like breakcorn
      if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Load butterchurn modules dynamically
      if (!butterchurnModule) {
        try {
          butterchurnModule = await import('butterchurn');
          butterchurnPresetsModule = await import('butterchurn-presets');
          console.log('Butterchurn modules loaded successfully');
        } catch (error) {
          console.error('Failed to load Butterchurn modules:', error);
          startStaticAnimation();
          return;
        }
      }
      
      // Initialize butterchurn exactly like breakcorn.ru
      butterchurnVisualizer = butterchurnModule.default.createVisualizer(sharedAudioContext, butterchurnCanvas, {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1
      });
      
      console.log('Butterchurn visualizer created');
      
      // Load presets like breakcorn
      presets = {};
      if (butterchurnPresetsModule) {
        // Try different export patterns
        const presetsData = butterchurnPresetsModule.default?.getPresets?.() || 
                           butterchurnPresetsModule.getPresets?.() || 
                           butterchurnPresetsModule.default || 
                           butterchurnPresetsModule;
        
        if (presetsData && typeof presetsData === 'object') {
          Object.assign(presets, presetsData);
          console.log('Butterchurn presets loaded:', Object.keys(presets).length);
        } else {
          console.warn('Could not load presets from module:', butterchurnPresetsModule);
        }
      }
      
      presetKeys = Object.keys(presets);
      if (presetKeys.length > 0) {
        presetIndex = Math.floor(Math.random() * presetKeys.length);
        const selectedPreset = presets[presetKeys[presetIndex]];
        butterchurnVisualizer.loadPreset(selectedPreset, 0.0);
        presetIndexHistory.push(presetIndex);
        console.log('Loaded random preset:', presetKeys[presetIndex]);
        
        // Start cycle interval like breakcorn
        if (presetCycle) {
          startCycleInterval();
        }
      }
      
      // Start rendering like breakcorn
      startRenderer();
      console.log('Butterchurn renderer started');
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
    } finally {
      isInitializing = false;
    }
  }
  
  // Render function exactly like breakcorn.ru
  function startRenderer() {
    if (!butterchurnVisualizer) {
      console.warn('No Butterchurn visualizer, falling back to static animation');
      startStaticAnimation();
      return;
    }
    
    isRendering = true;
    console.log('Starting Butterchurn renderer');
    
    const render = () => {
      if (theme !== 'butterchurn' || !isRendering) return;
      
      try {
        // Simple render call like breakcorn - Butterchurn handles audio internally
        butterchurnVisualizer.render();
        animationFrameId = requestAnimationFrame(render);
      } catch (error) {
        console.error('Butterchurn render error:', error);
        startStaticAnimation();
      }
    };
    
    render();
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
    isRendering = false;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    // Stop cycle interval
    if (cycleInterval) {
      clearInterval(cycleInterval);
      cycleInterval = null;
    }
    
    if (butterchurnVisualizer) {
      try {
        // Butterchurn may not have a destroy method, but we'll try
        if (butterchurnVisualizer.destroy) {
          butterchurnVisualizer.destroy();
        }
      } catch (e) {
        console.warn('Error destroying Butterchurn visualizer:', e);
      }
      butterchurnVisualizer = null;
    }
    
    if (butterchurnCanvas) {
      butterchurnCanvas.remove();
      butterchurnCanvas = null;
    }
    
    audioSource = null;
    isAudioConnected = false;
    console.log('Butterchurn cleaned up');
  }
  
  // Dynamic blur animation for Blur theme
  function startBlurAnimation() {
    let hue = 0;
    let intensity = 1;
    console.log('Starting dynamic blur animation');
    
    // Create background canvas for blur theme
    let blurCanvas = document.getElementById('blur-canvas') as HTMLCanvasElement;
    if (!blurCanvas) {
      blurCanvas = document.createElement('canvas');
      blurCanvas.id = 'blur-canvas';
      blurCanvas.style.position = 'fixed';
      blurCanvas.style.top = '0';
      blurCanvas.style.left = '0';
      blurCanvas.style.width = '100vw';
      blurCanvas.style.height = '100vh';
      blurCanvas.style.zIndex = '-1';
      blurCanvas.style.pointerEvents = 'none';
      blurCanvas.width = window.innerWidth;
      blurCanvas.height = window.innerHeight;
      document.body.appendChild(blurCanvas);
    }
    
    const ctx = blurCanvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      if (theme !== 'blur') {
        // Clean up
        if (blurCanvas) {
          blurCanvas.remove();
        }
        return;
      }
      
      hue = (hue + 1) % 360;
      const time = Date.now() * 0.001;
      
      // Check for audio data
      let audioIntensity = 1;
      if (typeof window !== 'undefined' && window.audioAnalyser && window.audioDataArray) {
        try {
          window.audioAnalyser.getByteFrequencyData(window.audioDataArray);
          const sum = window.audioDataArray.reduce((a: number, b: number) => a + b, 0);
          audioIntensity = 1 + (sum / window.audioDataArray.length) / 128;
        } catch (e) {
          // Ignore audio analysis errors
        }
      }
      
      intensity = 0.8 + 0.4 * Math.sin(time * 2) + 0.2 * audioIntensity;
      
      // Clear canvas
      ctx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
      
      // Create dynamic gradient with blur effect
      const gradient = ctx.createRadialGradient(
        blurCanvas.width * (0.5 + 0.3 * Math.sin(time * 0.5)),
        blurCanvas.height * (0.5 + 0.3 * Math.cos(time * 0.7)),
        0,
        blurCanvas.width * 0.8,
        blurCanvas.height * 0.8,
        blurCanvas.width * 0.8
      );
      
      gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${0.3 * intensity})`);
      gradient.addColorStop(0.3, `hsla(${(hue + 60) % 360}, 70%, 50%, ${0.2 * intensity})`);
      gradient.addColorStop(0.6, `hsla(${(hue + 120) % 360}, 70%, 40%, ${0.1 * intensity})`);
      gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, blurCanvas.width, blurCanvas.height);
      
      // Add moving blur spots
      for (let i = 0; i < 3; i++) {
        const spotGradient = ctx.createRadialGradient(
          blurCanvas.width * (0.2 + 0.6 * Math.sin(time * (0.3 + i * 0.2))),
          blurCanvas.height * (0.2 + 0.6 * Math.cos(time * (0.5 + i * 0.15))),
          0,
          0,
          0,
          100 * intensity
        );
        
        spotGradient.addColorStop(0, `hsla(${(hue + i * 80) % 360}, 80%, 70%, ${0.4 * intensity})`);
        spotGradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        
        ctx.fillStyle = spotGradient;
        ctx.fillRect(0, 0, blurCanvas.width, blurCanvas.height);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  // Preset control functions like breakcorn.ru
  function nextPreset(blendTime = defaultBlendTime) {
    if (!butterchurnVisualizer || presetKeys.length === 0) return;
    
    presetIndexHistory.push(presetIndex);
    const numPresets = presetKeys.length;
    
    if (presetRandom) {
      presetIndex = Math.floor(Math.random() * numPresets);
    } else {
      presetIndex = (presetIndex + 1) % numPresets;
    }
    
    const selectedPreset = presets[presetKeys[presetIndex]];
    butterchurnVisualizer.loadPreset(selectedPreset, blendTime);
    console.log('Next preset:', presetKeys[presetIndex]);
  }
  
  function prevPreset(blendTime = defaultBlendTime) {
    if (!butterchurnVisualizer || presetKeys.length === 0) return;
    
    const numPresets = presetKeys.length;
    
    if (presetIndexHistory.length > 0) {
      presetIndex = presetIndexHistory.pop() || 0;
    } else {
      presetIndex = ((presetIndex - 1) + numPresets) % numPresets;
    }
    
    const selectedPreset = presets[presetKeys[presetIndex]];
    butterchurnVisualizer.loadPreset(selectedPreset, blendTime);
    console.log('Previous preset:', presetKeys[presetIndex]);
  }
  
  function selectPresetByIndex(index: number) {
    if (!butterchurnVisualizer || presetKeys.length === 0 || index < 0 || index >= presetKeys.length) return;
    
    presetIndexHistory.push(presetIndex);
    presetIndex = index;
    
    const selectedPreset = presets[presetKeys[presetIndex]];
    butterchurnVisualizer.loadPreset(selectedPreset, 5.7);
    console.log('Selected preset:', presetKeys[presetIndex]);
  }
  
  function startCycleInterval() {
    if (cycleInterval) {
      clearInterval(cycleInterval);
    }
    
    if (presetCycle && presetCycleLength > 0) {
      cycleInterval = setInterval(() => {
        nextPreset(2.7);
      }, presetCycleLength * 1000);
      console.log('Started preset cycle interval:', presetCycleLength, 'seconds');
    }
  }
  
  function stopCycleInterval() {
    if (cycleInterval) {
      clearInterval(cycleInterval);
      cycleInterval = null;
      console.log('Stopped preset cycle interval');
    }
  }
  
  // Watch for cycle settings changes
  $effect(() => {
    if (theme === 'butterchurn' && butterchurnVisualizer) {
      if (presetCycle) {
        startCycleInterval();
      } else {
        stopCycleInterval();
      }
    }
  });

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
    
    // Handle window resize for Butterchurn like breakcorn
    window.addEventListener('resize', () => {
      if (theme === 'butterchurn' && butterchurnCanvas && butterchurnVisualizer) {
        butterchurnCanvas.width = window.innerWidth;
        butterchurnCanvas.height = window.innerHeight;
        // Butterchurn automatically handles resize, but we can try setRendererSize if it exists
        if (butterchurnVisualizer.setRendererSize) {
          butterchurnVisualizer.setRendererSize(window.innerWidth, window.innerHeight);
        }
      }
    });
    
    // Setup global functions for audio pipeline like breakcorn.ru
    window.initializeAudioPipeline = (audioContext: AudioContext, source: MediaElementAudioSourceNode) => {
      if (settingsModal) {
        console.log('Using settings modal audio pipeline');
        return settingsModal.initializeAudioPipeline(audioContext, source);
      }
      console.log('Settings modal not available, using direct connection');
      return source;
    };
    
    window.connectButterchurnAudio = (audioSourceNode: MediaElementAudioSourceNode | null) => {
      if (butterchurnVisualizer && audioSourceNode) {
        console.log('Connecting audio to Butterchurn visualizer');
        butterchurnVisualizer.connectAudio(audioSourceNode);
        isAudioConnected = true;
        audioSource = audioSourceNode;
      } else {
        console.log('Disconnecting audio from Butterchurn');
        isAudioConnected = false;
        audioSource = null;
      }
    };
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupButterchurn);
    
    // Keyboard controls like breakcorn.ru
    window.addEventListener('keydown', (e) => {
      if (theme !== 'butterchurn' || !butterchurnVisualizer) return;
      
      if (e.which === 32 || e.which === 39) { // Spacebar || ArrowRight
        e.preventDefault();
        nextPreset(5.7);
      } else if (e.which === 8 || e.which === 37) { // Backspace || ArrowLeft
        e.preventDefault();
        prevPreset(0.0);
      } else if (e.which === 72) { // KeyH
        e.preventDefault();
        nextPreset(0.0);
      }
    });
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
          <option value="plum">🍇 Plum</option>
          <option value="blur">✨ Blur</option>
          <option value="butterchurn">🌈 Butterchurn</option>
        </select>
      </div>
    </div>
  </header>

  <TabNavigation {tabs} {activeTab} onTabChange={handleTabChange} onSettingsClick={handleSettingsClick} />

  <main class="app-main">
    <!-- Debug: Current tab is {activeTab} -->
    {#if activeTab === 'http-client'}
      <HttpClient />
    {:else if activeTab === 'network-tools'}
      <NetworkTools />
    {:else if activeTab === 'radio-player'}
      <div>Rendering RadioPlayer component...</div>
      <RadioPlayer />
    {:else}
      <div>Unknown tab: {activeTab}</div>
    {/if}
  </main>

  <footer class="app-footer">
    <p>Built with ❤️ using Tauri, SvelteKit, and Rust</p>
  </footer>
</div>

<!-- Butterchurn Controls like breakcorn.ru -->
{#if theme === 'butterchurn' && butterchurnVisualizer && presetKeys.length > 0}
  <div class="butterchurn-controls">
    <h3>🌈 Butterchurn Visualizer</h3>
    
    <div class="preset-nav">
      <button onclick={() => prevPreset(0.0)} title="Previous preset (← or Backspace)">
        ←
      </button>
      <button onclick={() => nextPreset(0.0)} title="Random preset (H)">
        🎲
      </button>
      <button onclick={() => nextPreset(5.7)} title="Next preset (→ or Space)">
        →
      </button>
    </div>
    
    <select 
      class="preset-select" 
      bind:value={presetIndex} 
      onchange={(e) => selectPresetByIndex(parseInt(e.target.value))}
    >
      {#each presetKeys as key, i}
        <option value={i}>
          {key.length > 40 ? key.substring(0, 40) + '...' : key}
        </option>
      {/each}
    </select>
    
    <div class="preset-controls">
      <div class="preset-control-row">
        <label>
          <input type="checkbox" bind:checked={presetRandom} />
          Random
        </label>
      </div>
      
      <div class="preset-control-row">
        <label>
          <input type="checkbox" bind:checked={presetCycle} />
          Cycle
        </label>
      </div>
      
      <div class="preset-control-row">
        <label for="cycle-length-input">Length:</label>
        <input 
          id="cycle-length-input"
          type="number" 
          bind:value={presetCycleLength} 
          min="5" 
          max="120" 
          step="1"
        />
        <span style="font-size: 0.8rem; opacity: 0.8;">s</span>
      </div>
    </div>
  </div>
{/if}

<!-- Settings Modal -->
<SettingsModal bind:this={settingsModal} />

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

  :global([data-theme="plum"]) {
    /* Plum glassmorphism theme with gradient background */
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
    --bg-color: linear-gradient(135deg, 
      rgba(30, 30, 60, 0.9) 0%, 
      rgba(15, 15, 30, 0.95) 50%, 
      rgba(40, 20, 60, 0.9) 100%);
    --card-bg: rgba(0, 0, 0, 0.4);
    --input-bg: rgba(0, 0, 0, 0.3);
    --secondary-bg: rgba(0, 0, 0, 0.35);
    --border-color: rgba(255, 255, 255, 0.3);
    --hover-bg: rgba(0, 0, 0, 0.5);
    --code-bg: rgba(0, 0, 0, 0.6);
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    --glass-backdrop: blur(12px);
    --glass-border: rgba(255, 255, 255, 0.2);
  }

  :global([data-theme="blur"]) {
    /* Simple blur theme - old butterchurn without visualization */
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

  :global([data-theme="butterchurn"]) {
    /* Butterchurn theme exactly like breakcorn.ru */
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
    --card-bg: rgba(0, 0, 0, 0.6);
    --input-bg: rgba(0, 0, 0, 0.4);
    --secondary-bg: rgba(0, 0, 0, 0.5);
    --border-color: rgba(255, 255, 255, 0.2);
    --hover-bg: rgba(0, 0, 0, 0.7);
    --code-bg: rgba(0, 0, 0, 0.7);
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    --glass-backdrop: blur(10px);
    --glass-border: rgba(255, 255, 255, 0.15);
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

  /* Plum theme styling */
  :global([data-theme="plum"]) {
    background: var(--bg-color);
  }

  :global([data-theme="plum"] .app-header),
  :global([data-theme="plum"] .app-main),
  :global([data-theme="plum"] .app-footer) {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow);
  }

  :global([data-theme="plum"] input),
  :global([data-theme="plum"] select),
  :global([data-theme="plum"] button) {
    background: rgba(0, 0, 0, 0.3) !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    color: rgba(255, 255, 255, 0.95) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  :global([data-theme="plum"] input:focus),
  :global([data-theme="plum"] select:focus),
  :global([data-theme="plum"] button:hover) {
    background: rgba(0, 0, 0, 0.5) !important;
    border: 1px solid rgba(255, 255, 255, 0.5) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }

  /* Blur theme styling - simple glassmorphism */
  :global([data-theme="blur"] .app-header),
  :global([data-theme="blur"] .app-main),
  :global([data-theme="blur"] .app-footer) {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow);
  }

  :global([data-theme="blur"] input),
  :global([data-theme="blur"] select),
  :global([data-theme="blur"] button) {
    background: rgba(0, 0, 0, 0.3) !important;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    color: rgba(255, 255, 255, 0.95) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  :global([data-theme="blur"] input:focus),
  :global([data-theme="blur"] select:focus),
  :global([data-theme="blur"] button:hover) {
    background: rgba(0, 0, 0, 0.5) !important;
    border: 1px solid rgba(255, 255, 255, 0.5) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }

  /* Butterchurn theme - exactly like breakcorn.ru */
  :global([data-theme="butterchurn"] #butterchurn-canvas) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    filter: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    z-index: -1 !important;
    border: none !important;
  }

  :global([data-theme="butterchurn"] .app-header),
  :global([data-theme="butterchurn"] .app-main),
  :global([data-theme="butterchurn"] .app-footer) {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow);
  }

  :global([data-theme="butterchurn"] input),
  :global([data-theme="butterchurn"] select),
  :global([data-theme="butterchurn"] button) {
    background: rgba(0, 0, 0, 0.4) !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: rgba(255, 255, 255, 0.95) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  :global([data-theme="butterchurn"] input:focus),
  :global([data-theme="butterchurn"] select:focus),
  :global([data-theme="butterchurn"] button:hover) {
    background: rgba(0, 0, 0, 0.7) !important;
    border: 1px solid rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    transform: translateY(-1px);
  }

  /* Butterchurn preset controls like breakcorn.ru */
  :global([data-theme="butterchurn"] .butterchurn-controls) {
    position: fixed;
    top: 100px;
    right: 20px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 15px;
    min-width: 300px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }

  :global([data-theme="butterchurn"] .butterchurn-controls h3) {
    margin: 0 0 15px 0;
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.1rem;
    font-weight: 600;
  }

  :global([data-theme="butterchurn"] .preset-nav) {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    align-items: center;
  }

  :global([data-theme="butterchurn"] .preset-nav button) {
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: rgba(255, 255, 255, 0.9) !important;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.25s;
    min-width: 40px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global([data-theme="butterchurn"] .preset-nav button:hover) {
    background: rgba(255, 255, 255, 0.2) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
  }

  :global([data-theme="butterchurn"] .preset-select) {
    width: 100%;
    background: rgba(0, 0, 0, 0.5) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: rgba(255, 255, 255, 0.95) !important;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    margin-bottom: 15px;
  }

  :global([data-theme="butterchurn"] .preset-controls) {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  :global([data-theme="butterchurn"] .preset-control-row) {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  :global([data-theme="butterchurn"] .preset-control-row label) {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    min-width: 60px;
  }

  :global([data-theme="butterchurn"] .preset-control-row input[type="checkbox"]) {
    width: 16px;
    height: 16px;
  }

  :global([data-theme="butterchurn"] .preset-control-row input[type="number"]) {
    width: 60px;
    padding: 4px 8px;
    font-size: 0.85rem;
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