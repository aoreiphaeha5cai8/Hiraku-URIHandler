<script lang="ts">
  interface Props {
    presetKeys: string[];
    presetIndex: number;
    presetRandom: boolean;
    presetCycle: boolean;
    presetCycleLength: number;
    butterchurnVisualizer: any;
    onNextPreset: (blendTime?: number) => void;
    onPrevPreset: (blendTime?: number) => void;
    onSelectPreset: (index: number) => void;
    onToggleRandom: () => void;
    onToggleCycle: () => void;
    onCycleLengthChange: (length: number) => void;
  }
  
  let {
    presetKeys,
    presetIndex,
    presetRandom,
    presetCycle,
    presetCycleLength,
    butterchurnVisualizer,
    onNextPreset,
    onPrevPreset,
    onSelectPreset,
    onToggleRandom,
    onToggleCycle,
    onCycleLengthChange
  }: Props = $props();
  
  let defaultBlendTime = 5.7;
</script>

{#if butterchurnVisualizer && presetKeys.length > 0}
  <div class="butterchurn-controls">
    <h3>🌈 Butterchurn Visualizer Controls</h3>
    
    <div class="preset-nav">
      <button onclick={() => onPrevPreset(0.0)} title="Previous preset (← or Backspace)">
        ←
      </button>
      <button onclick={() => onNextPreset(0.0)} title="Random preset (H)">
        🎲
      </button>
      <button onclick={() => onNextPreset(defaultBlendTime)} title="Next preset (→ or Space)">
        →
      </button>
    </div>
    
    <div class="preset-selection">
      <label for="preset-select">Active Preset:</label>
      <select 
        id="preset-select"
        class="preset-select" 
        bind:value={presetIndex} 
        onchange={(e) => onSelectPreset(parseInt(e.target.value))}
      >
        {#each presetKeys as key, i}
          <option value={i}>
            {key.length > 40 ? key.substring(0, 40) + '...' : key}
          </option>
        {/each}
      </select>
    </div>
    
    <div class="preset-controls">
      <div class="preset-control-row">
        <label>
          <input type="checkbox" bind:checked={presetRandom} onchange={onToggleRandom} />
          Random Selection
        </label>
        <span class="control-help">Randomly select presets instead of sequential</span>
      </div>
      
      <div class="preset-control-row">
        <label>
          <input type="checkbox" bind:checked={presetCycle} onchange={onToggleCycle} />
          Auto-Cycle
        </label>
        <span class="control-help">Automatically switch presets</span>
      </div>
      
      <div class="preset-control-row">
        <label for="cycle-length-input">Cycle Length:</label>
        <div class="cycle-length-control">
          <input 
            id="cycle-length-input"
            type="number" 
            bind:value={presetCycleLength} 
            oninput={(e) => onCycleLengthChange(parseInt(e.target.value))}
            min="5" 
            max="120" 
            step="1"
          />
          <span class="unit">seconds</span>
        </div>
      </div>
    </div>
    
    <div class="keyboard-shortcuts">
      <h4>Keyboard Shortcuts:</h4>
      <div class="shortcuts-grid">
        <div class="shortcut-item">
          <kbd>Space</kbd> or <kbd>→</kbd>
          <span>Next preset</span>
        </div>
        <div class="shortcut-item">
          <kbd>Backspace</kbd> or <kbd>←</kbd>
          <span>Previous preset</span>
        </div>
        <div class="shortcut-item">
          <kbd>H</kbd>
          <span>Random preset</span>
        </div>
      </div>
    </div>
  </div>
{:else if butterchurnVisualizer}
  <div class="butterchurn-loading">
    <p>🔄 Loading Butterchurn presets...</p>
  </div>
{:else}
  <div class="butterchurn-disabled">
    <p>🌈 Switch to Butterchurn theme to enable controls</p>
  </div>
{/if}

<style>
  .butterchurn-controls {
    background: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 1.5rem;
  }
  
  .butterchurn-controls h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-color);
    font-size: 1.2rem;
    font-weight: 600;
  }
  
  .preset-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 1.5rem;
    justify-content: center;
  }
  
  .preset-nav button {
    background: var(--primary-color);
    border: 1px solid var(--primary-color);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.25s;
    min-width: 45px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }
  
  .preset-nav button:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }
  
  .preset-selection {
    margin-bottom: 1.5rem;
  }
  
  .preset-selection label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-color);
  }
  
  .preset-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 0.9rem;
  }
  
  .preset-controls {
    margin-bottom: 1.5rem;
  }
  
  .preset-control-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .preset-control-row label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color);
    font-weight: 500;
  }
  
  .control-help {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-left: 1.5rem;
  }
  
  .cycle-length-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1.5rem;
  }
  
  .cycle-length-control input[type="number"] {
    width: 80px;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-color);
  }
  
  .unit {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .keyboard-shortcuts {
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
  }
  
  .keyboard-shortcuts h4 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1rem;
    font-weight: 600;
  }
  
  .shortcuts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .shortcut-item kbd {
    background: var(--code-bg);
    color: var(--text-color);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-family: monospace;
    border: 1px solid var(--border-color);
    min-width: 2rem;
    text-align: center;
  }
  
  .shortcut-item span {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  .butterchurn-loading,
  .butterchurn-disabled {
    background: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 2rem;
    margin-top: 1.5rem;
    text-align: center;
  }
  
  .butterchurn-loading p,
  .butterchurn-disabled p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1rem;
  }
  
  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--primary-color);
  }
  
  @media (max-width: 600px) {
    .preset-nav {
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .preset-nav button {
      min-width: 40px;
      font-size: 0.9rem;
    }
    
    .shortcuts-grid {
      gap: 0.75rem;
    }
    
    .shortcut-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>