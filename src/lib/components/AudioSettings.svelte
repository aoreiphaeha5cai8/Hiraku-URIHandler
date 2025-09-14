<script lang="ts">
  import { onMount } from 'svelte';
  
  // Audio nodes state
  let audioCtx: AudioContext | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let gainNode: GainNode | null = null;
  let pannerNode: StereoPannerNode | null = null;
  let compressorNode: DynamicsCompressorNode | null = null;
  
  // NexusUI controls
  let dialThreshold: any = null;
  let dialKnee: any = null;
  let dialRatio: any = null;
  let dialAttack: any = null;
  let dialRelease: any = null;
  
  // Control values
  let volume = $state(1.0);
  let pan = $state(0.0);
  let threshold = $state(-50.0);
  let knee = $state(40.0);
  let ratio = $state(12.0);
  let attack = $state(0.0);
  let release = $state(0.25);
  
  // Initialize audio pipeline like breakcorn.ru
  export function initializeAudioPipeline(audioContext: AudioContext, source: MediaElementAudioSourceNode) {
    console.log('Initializing audio pipeline with compressor');
    
    audioCtx = audioContext;
    sourceNode = source;
    
    // Create audio nodes like breakcorn
    gainNode = new GainNode(audioCtx);
    pannerNode = new StereoPannerNode(audioCtx, { pan: 0 });
    compressorNode = audioCtx.createDynamicsCompressor();
    
    // Set initial compressor values
    compressorNode.threshold.setValueAtTime(threshold, audioCtx.currentTime);
    compressorNode.knee.setValueAtTime(knee, audioCtx.currentTime);
    compressorNode.ratio.setValueAtTime(ratio, audioCtx.currentTime);
    compressorNode.attack.setValueAtTime(attack, audioCtx.currentTime);
    compressorNode.release.setValueAtTime(release, audioCtx.currentTime);
    
    // Connect audio graph like breakcorn: source -> compressor -> gain -> panner -> destination
    sourceNode.connect(compressorNode);
    compressorNode.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(audioCtx.destination);
    
    console.log('Audio pipeline initialized');
    return sourceNode; // Return for Butterchurn connection
  }
  
  // Initialize NexusUI dials like breakcorn
  onMount(async () => {
    // Import NexusUI dynamically
    const Nexus = await import('nexusui');
    
    // Create dials exactly like breakcorn.ru
    dialThreshold = new Nexus.Dial('#dial_threshold', {
      'size': [75,75],
      'interaction': 'vertical',
      'mode': 'relative',
      'min': -100,
      'max': 0,
      'step': 0.1,
      'value': -50
    });
    
    dialKnee = new Nexus.Dial('#dial_knee', {
      'size': [75,75],
      'interaction': 'vertical',
      'mode': 'relative',
      'min': 0.1,
      'max': 40.0,
      'step': 0.1,
      'value': 40.0
    });
    
    dialRatio = new Nexus.Dial('#dial_ratio', {
      'size': [75,75],
      'interaction': 'vertical',
      'mode': 'relative',
      'min': 1,
      'max': 20,
      'step': 0.1,
      'value': 12.0
    });
    
    dialAttack = new Nexus.Dial('#dial_attack', {
      'size': [75,75],
      'interaction': 'vertical',
      'mode': 'relative',
      'min': 0.001,
      'max': 1.0,
      'step': 0.001,
      'value': 0.0
    });
    
    dialRelease = new Nexus.Dial('#dial_release', {
      'size': [75,75],
      'interaction': 'vertical',
      'mode': 'relative',
      'min': 0.001,
      'max': 1.0,
      'step': 0.001,
      'value': 0.25
    });
    
    // Add event listeners like breakcorn
    dialThreshold.on('change', (v: number) => {
      threshold = v;
      if (compressorNode && audioCtx) {
        compressorNode.threshold.setValueAtTime(v, audioCtx.currentTime);
      }
    });
    
    dialKnee.on('change', (v: number) => {
      knee = v;
      if (compressorNode && audioCtx) {
        compressorNode.knee.setValueAtTime(v, audioCtx.currentTime);
      }
    });
    
    dialRatio.on('change', (v: number) => {
      ratio = v;
      if (compressorNode && audioCtx) {
        compressorNode.ratio.setValueAtTime(v, audioCtx.currentTime);
      }
    });
    
    dialAttack.on('change', (v: number) => {
      attack = v;
      if (compressorNode && audioCtx) {
        compressorNode.attack.setValueAtTime(v, audioCtx.currentTime);
      }
    });
    
    dialRelease.on('change', (v: number) => {
      release = v;
      if (compressorNode && audioCtx) {
        compressorNode.release.setValueAtTime(v, audioCtx.currentTime);
      }
    });
    
    console.log('NexusUI dials initialized');
  });
  
  // Compressor presets like breakcorn
  export function setCompressorPreset(t: number, k: number, r: number, a: number, rel: number) {
    threshold = t;
    knee = k;
    ratio = r;
    attack = a;
    release = rel;
    
    // Update dials
    if (dialThreshold) dialThreshold.value = t;
    if (dialKnee) dialKnee.value = k;
    if (dialRatio) dialRatio.value = r;
    if (dialAttack) dialAttack.value = a;
    if (dialRelease) dialRelease.value = rel;
    
    console.log('Compressor preset applied:', { threshold: t, knee: k, ratio: r, attack: a, release: rel });
  }
  
  // Volume and pan updates
  $effect(() => {
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  });
  
  $effect(() => {
    if (pannerNode) {
      pannerNode.pan.value = pan;
    }
  });
</script>

<div class="audio-settings">
  <div class="master-controls">
    <h3>Master Controls</h3>
    <div class="controls-grid">
      <div class="control-group">
        <label for="volume-control">Volume</label>
        <input 
          id="volume-control"
          type="range" 
          min="0" 
          max="2" 
          step="0.01" 
          bind:value={volume}
          class="control-slider"
        />
        <span class="control-value">{volume.toFixed(2)}</span>
      </div>
      
      <div class="control-group">
        <label for="pan-control">Pan</label>
        <input 
          id="pan-control"
          type="range" 
          min="-1" 
          max="1" 
          step="0.01" 
          bind:value={pan}
          class="control-slider"
        />
        <span class="control-value">{pan.toFixed(2)}</span>
      </div>
    </div>
  </div>
  
  <div class="compressor-section">
    <h3>Dynamics Compressor</h3>
    <div class="compressor-dials">
      <div class="dial-group">
        <div id="dial_threshold"></div>
        <label>Threshold</label>
        <span class="dial-value">{threshold.toFixed(1)} dB</span>
      </div>
      
      <div class="dial-group">
        <div id="dial_knee"></div>
        <label>Knee</label>
        <span class="dial-value">{knee.toFixed(1)}</span>
      </div>
      
      <div class="dial-group">
        <div id="dial_ratio"></div>
        <label>Ratio</label>
        <span class="dial-value">{ratio.toFixed(1)}:1</span>
      </div>
      
      <div class="dial-group">
        <div id="dial_attack"></div>
        <label>Attack</label>
        <span class="dial-value">{attack.toFixed(3)} s</span>
      </div>
      
      <div class="dial-group">
        <div id="dial_release"></div>
        <label>Release</label>
        <span class="dial-value">{release.toFixed(3)} s</span>
      </div>
    </div>
    
    <div class="compressor-presets">
      <h4>Presets:</h4>
      <div class="preset-buttons">
        <button 
          class="preset-button"
          onclick={() => setCompressorPreset(0.0, 30.0, 1.0, 0.003, 0.25)}
        >
          None
        </button>
        <button 
          class="preset-button"
          onclick={() => setCompressorPreset(-12.0, 30.0, 6.0, 0.003, 0.25)}
        >
          Low
        </button>
        <button 
          class="preset-button"
          onclick={() => setCompressorPreset(-30.0, 30.0, 12.0, 0.003, 0.25)}
        >
          Medium
        </button>
        <button 
          class="preset-button"
          onclick={() => setCompressorPreset(-50.0, 30.0, 20.0, 0.003, 0.25)}
        >
          High
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .audio-settings {
    padding: 1.5rem;
    background: var(--card-bg);
    border-radius: 12px;
    border: 1px solid var(--border-color);
  }
  
  .master-controls h3,
  .compressor-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .control-group {
    text-align: center;
  }
  
  .control-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-color);
  }
  
  .control-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--secondary-bg);
    outline: none;
    cursor: pointer;
    margin-bottom: 0.5rem;
  }
  
  .control-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }
  
  .control-value {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-family: monospace;
  }
  
  .compressor-dials {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .dial-group {
    text-align: center;
  }
  
  .dial-group label {
    display: block;
    margin: 0.5rem 0 0.25rem 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
  }
  
  .dial-value {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-family: monospace;
  }
  
  .compressor-presets h4 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1rem;
  }
  
  .preset-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .preset-button {
    padding: 0.5rem 1rem;
    background: var(--secondary-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.25s;
    height: 2.4rem;
  }
  
  .preset-button:hover {
    background: var(--primary-color);
    color: white;
    transform: translateY(-1px);
  }
  
  .preset-button.active {
    background: var(--primary-color);
    color: white;
  }
  
  @media (max-width: 768px) {
    .controls-grid {
      grid-template-columns: 1fr;
    }
    
    .compressor-dials {
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    
    .preset-buttons {
      justify-content: center;
    }
  }
</style>