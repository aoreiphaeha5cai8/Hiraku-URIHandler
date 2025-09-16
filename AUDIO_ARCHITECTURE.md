# Audio System Architecture Documentation

## Overview

The Network Toolkit features a sophisticated audio processing system that combines internet radio streaming with real-time audio analysis and live visualization powered by Butterchurn. The architecture follows the breakcorn.ru approach with modern Web Audio API implementation.

## System Components

### 1. Audio Pipeline Architecture

```
[Internet Radio Stream]
         ↓
[HTML Audio Element]
         ↓
[MediaElementAudioSourceNode]
         ↓
[DynamicsCompressor] ← Configurable parameters
         ↓
[AnalyserNode] → [AudioDataArray] → [Butterchurn Visualizer]
         ↓
[AudioDestination] (Speakers)
```

### 2. Core Components

#### RadioPlayer Component (`src/lib/tabs/RadioPlayer.svelte`)
- **Purpose**: Main interface for radio streaming
- **Features**:
  - 15+ predefined radio stations
  - Format support: MP3, AAC, OGG, M3U/PLS
  - Automatic fallback URLs
  - Real-time volume control
  - User interaction tracking for autoplay policy

#### SettingsModal Component (`src/lib/components/SettingsModal.svelte`)
- **Purpose**: Audio processing configuration interface
- **Features**:
  - Dynamic compressor parameter adjustment
  - Butterchurn preset management
  - Cycling configuration (5-120 seconds)
  - Real-time parameter preview

#### AudioSettings Component (`src/lib/components/AudioSettings.svelte`)
- **Purpose**: Advanced compressor controls
- **Features**:
  - Threshold, Knee, Ratio, Attack, Release sliders
  - Preset management (None/Low/Medium/High)
  - Visual parameter feedback
  - Real-time audio chain updates

## Audio Processing Details

### Dynamic Range Compression

The system uses Web Audio API's `DynamicsCompressor` node for professional audio processing:

```javascript
// Compressor configuration
const compressor = audioContext.createDynamicsCompressor();
compressor.threshold.value = -24;    // dB - input level where compression starts
compressor.knee.value = 30;          // dB - smooth transition range
compressor.ratio.value = 12;         // 12:1 compression ratio
compressor.attack.value = 0.003;     // 3ms - how quickly compression applies
compressor.release.value = 0.25;     // 250ms - how quickly compression releases
```

### Compression Presets

| Preset | Threshold | Knee | Ratio | Attack | Release | Use Case |
|--------|-----------|------|-------|--------|---------|----------|
| **None** | 0 | 0 | 1 | 0 | 0 | No processing |
| **Low** | -18 dB | 20 dB | 4:1 | 5ms | 100ms | Light dynamics control |
| **Medium** | -24 dB | 30 dB | 8:1 | 3ms | 250ms | Balanced processing |
| **High** | -30 dB | 40 dB | 12:1 | 1ms | 500ms | Heavy compression |

### Audio Analysis Chain

```javascript
// Create analysis node for visualization
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.8;

// Connect after compressor but before destination
compressor.connect(analyser);
analyser.connect(audioContext.destination);

// Create data array for frequency analysis
const audioDataArray = new Uint8Array(analyser.frequencyBinCount);

// Real-time analysis loop
function updateAudioData() {
  analyser.getByteFrequencyData(audioDataArray);
  // Data now available for visualization
}
```

## Butterchurn Integration

### Initialization Process

```javascript
// Dynamic module loading to avoid SSR issues
const butterchurnModule = await import('butterchurn');
const butterchurnPresetsModule = await import('butterchurn-presets');

// Create visualizer with optimal settings
const visualizer = butterchurnModule.default.createVisualizer(audioContext, canvas, {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio || 1,
  textureRatio: 1
});

// Load presets collection
const presets = butterchurnPresetsModule.default.getPresets();
const presetKeys = Object.keys(presets);
```

### Preset Management System

```javascript
// Preset switching with blend transitions
function nextPreset(blendTime = 5.7) {
  const numPresets = presetKeys.length;
  
  if (presetRandom) {
    presetIndex = Math.floor(Math.random() * numPresets);
  } else {
    presetIndex = (presetIndex + 1) % numPresets;
  }
  
  const selectedPreset = presets[presetKeys[presetIndex]];
  visualizer.loadPreset(selectedPreset, blendTime);
}

// Automatic cycling with configurable intervals
function startCycleInterval() {
  if (presetCycle && presetCycleLength > 0) {
    cycleInterval = setInterval(() => {
      nextPreset(2.7); // Faster blend for auto-switching
    }, presetCycleLength * 1000);
  }
}
```

### Audio Connection to Butterchurn

```javascript
// Global function for audio pipeline integration
window.connectButterchurnAudio = (audioSourceNode) => {
  if (butterchurnVisualizer && audioSourceNode) {
    console.log('Connecting audio to Butterchurn visualizer');
    butterchurnVisualizer.connectAudio(audioSourceNode);
    isAudioConnected = true;
  }
};

// Integration with radio player
function setupAudioAnalysis() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaElementSource(audioElement);
  
  // Process through compressor
  const finalSource = window.initializeAudioPipeline(audioContext, source) || source;
  
  // Connect to Butterchurn
  window.connectButterchurnAudio(finalSource);
}
```

## Theme Integration

### Butterchurn Theme Implementation

The Butterchurn theme creates a full-screen visualization background:

```css
:global([data-theme="butterchurn"]) {
  --bg-color: transparent;
  --card-bg: rgba(0, 0, 0, 0.6);
  --glass-backdrop: blur(10px);
}

:global([data-theme="butterchurn"] #butterchurn-canvas) {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}
```

### Fallback Animation System

When WebGL is unavailable, the system provides CSS-based animations:

```javascript
function startStaticAnimation() {
  let hue = 0;
  
  const animate = () => {
    hue = (hue + 2) % 360;
    
    // Audio-reactive intensity calculation
    let intensity = 1;
    if (isAudioConnected && audioAnalyser && audioDataArray) {
      audioAnalyser.getByteFrequencyData(audioDataArray);
      const sum = audioDataArray.reduce((a, b) => a + b, 0);
      intensity = 1 + (sum / audioDataArray.length) / 64;
    }
    
    // Dynamic gradient generation
    const time = Date.now() * 0.002;
    butterchurnCanvas.style.background = `
      radial-gradient(circle at ${50 + 40 * intensity * Math.sin(time)}% ${50 + 30 * intensity * Math.cos(time * 1.5)}%, 
                     hsla(${hue}, 90%, ${60 + intensity * 20}%, ${0.6 + intensity * 0.2}) 0%, transparent 70%)
    `;
    
    requestAnimationFrame(animate);
  };
}
```

## Control Interface

### Keyboard Shortcuts (Butterchurn Theme)

| Key | Action | Blend Time |
|-----|--------|-----------|
| `Space` / `→` | Next preset | 5.7s |
| `Backspace` / `←` | Previous preset | 0.0s (instant) |
| `H` | Hard cut to next | 0.0s (instant) |

### Modal Controls

- **Preset Navigation**: Previous/Next buttons with visual feedback
- **Random Toggle**: Switch between sequential and random preset selection
- **Cycle Toggle**: Enable/disable automatic preset cycling
- **Cycle Length**: Adjustable interval (5-120 seconds)
- **Compressor Settings**: Real-time parameter adjustment

## Error Handling & Resilience

### Audio Context Management

```javascript
// Proper cleanup on component unmount
function cleanupButterchurn() {
  isRendering = false;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  if (butterchurnVisualizer?.destroy) {
    butterchurnVisualizer.destroy();
  }
  
  if (audioContext?.state !== 'closed') {
    audioContext.close();
  }
}
```

### Fallback Strategies

1. **WebGL Fallback**: Static CSS animations when WebGL unavailable
2. **Module Loading**: Graceful degradation if Butterchurn modules fail to load
3. **Audio Context**: Automatic resume on user interaction for autoplay policy
4. **Network Resilience**: Automatic fallback URLs for radio streams

## Performance Optimizations

### Efficient Rendering Loop

```javascript
function startRenderer() {
  const render = () => {
    if (theme !== 'butterchurn' || !isRendering) return;
    
    try {
      butterchurnVisualizer.render();
      animationFrameId = requestAnimationFrame(render);
    } catch (error) {
      console.error('Render error, falling back:', error);
      startStaticAnimation();
    }
  };
  render();
}
```

### Memory Management

- **Single AudioContext**: Reused across components
- **Proper Cleanup**: All resources disposed on component unmount
- **Canvas Reuse**: Single canvas element for all visualizations
- **Preset Caching**: Presets loaded once and cached in memory

## Testing Strategy

### Automated Tests (77.5% coverage)

- **Audio Chain Creation**: Web Audio API node connections
- **Compressor Configuration**: Parameter validation and application
- **Butterchurn Integration**: Visualizer initialization and audio connection
- **Error Handling**: Graceful degradation scenarios
- **Resource Cleanup**: Memory leak prevention

### Manual Testing Requirements

- **UI Components**: Svelte 5 SSR limitations require browser testing
- **Audio Playback**: Real user interaction needed for autoplay policy
- **Visual Verification**: Butterchurn effects require visual inspection
- **Performance**: Frame rate and responsiveness under different loads

## Future Enhancements

### Planned Features

1. **Custom Preset Creation**: User-defined visualization parameters
2. **Audio Effects**: Additional processing nodes (reverb, delay, EQ)
3. **MIDI Control**: Hardware controller integration
4. **Preset Sharing**: Community preset exchange
5. **Performance Analytics**: Real-time performance monitoring

### Technical Improvements

1. **Worker-based Analysis**: Offload FFT processing to Web Workers
2. **GPU Acceleration**: WebGPU support for enhanced performance
3. **Progressive Loading**: Lazy loading of visualization assets
4. **Adaptive Quality**: Dynamic quality adjustment based on performance

---

**Author**: AI Assistant  
**Date**: 2025-09-16  
**Version**: 1.0  
**Framework**: SvelteKit + Tauri + Web Audio API + Butterchurn