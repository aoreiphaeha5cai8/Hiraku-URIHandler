<script lang="ts">
  import AudioSettings from './AudioSettings.svelte';
  import ButterchurmControls from './ButterchurmControls.svelte';
  
  interface Props {
    // Butterchurn props
    presetKeys?: string[];
    presetIndex?: number;
    presetRandom?: boolean;
    presetCycle?: boolean;
    presetCycleLength?: number;
    butterchurnVisualizer?: any;
    onNextPreset?: (blendTime?: number) => void;
    onPrevPreset?: (blendTime?: number) => void;
    onSelectPreset?: (index: number) => void;
    onToggleRandom?: () => void;
    onToggleCycle?: () => void;
    onCycleLengthChange?: (length: number) => void;
  }
  
  let {
    presetKeys = [],
    presetIndex = 0,
    presetRandom = true,
    presetCycle = true,
    presetCycleLength = 15,
    butterchurnVisualizer = null,
    onNextPreset = () => {},
    onPrevPreset = () => {},
    onSelectPreset = () => {},
    onToggleRandom = () => {},
    onToggleCycle = () => {},
    onCycleLengthChange = () => {}
  }: Props = $props();
  
  let audioSettingsRef: AudioSettings = $state();
  let isOpen = $state(false);
  
  export function openModal() {
    isOpen = true;
  }
  
  export function closeModal() {
    isOpen = false;
  }
  
  // Export audio settings methods
  export function initializeAudioPipeline(audioContext: AudioContext, source: MediaElementAudioSourceNode) {
    return audioSettingsRef?.initializeAudioPipeline(audioContext, source);
  }
  
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚙️ Audio Settings</h2>
        <button class="close-button" onclick={closeModal}>×</button>
      </div>
      
      <div class="modal-body">
        <div class="settings-description">
          <p>Professional audio processing controls for enhanced listening experience.</p>
        </div>
        
        <AudioSettings bind:this={audioSettingsRef} />
        
        <ButterchurmControls 
          {presetKeys}
          {presetIndex}
          {presetRandom}
          {presetCycle}
          {presetCycleLength}
          {butterchurnVisualizer}
          {onNextPreset}
          {onPrevPreset}
          {onSelectPreset}
          {onToggleRandom}
          {onToggleCycle}
          {onCycleLengthChange}
        />
        
        <div class="butterchurn-info">
          <p>
            <a href="https://github.com/jberg/butterchurn" target="_blank" rel="noopener noreferrer">
              Butterchurn
            </a> is a WebGL implementation of the 
            <a href="https://www.geisswerks.com/milkdrop/" target="_blank" rel="noopener noreferrer">
              Milkdrop Visualizer
            </a>.
            Licensed under the MIT License.
          </p>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="ok-button" onclick={closeModal}>OK</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.25s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: var(--card-bg);
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    max-width: 900px;
    max-height: 90vh;
    width: 90vw;
    overflow: hidden;
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--secondary-bg);
  }
  
  .modal-header h2 {
    margin: 0;
    color: var(--text-color);
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s;
  }
  
  .close-button:hover {
    background: var(--hover-bg);
    color: var(--text-color);
    transform: scale(1.1);
  }
  
  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    max-height: calc(90vh - 200px);
  }
  
  .settings-description {
    margin-bottom: 2rem;
  }
  
  .settings-description p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1rem;
    text-align: center;
  }
  
  .butterchurn-info {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--info-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }
  
  .butterchurn-info p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: 0.9rem;
    text-align: center;
  }
  
  .butterchurn-info a {
    color: var(--primary-color);
    text-decoration: none;
  }
  
  .butterchurn-info a:hover {
    text-decoration: underline;
  }
  
  .modal-footer {
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--border-color);
    background: var(--secondary-bg);
    text-align: center;
  }
  
  .ok-button {
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 2rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s;
    height: 2.4rem;
  }
  
  .ok-button:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    .modal-content {
      width: 95vw;
      max-height: 95vh;
    }
    
    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 1rem;
    }
    
    .modal-header h2 {
      font-size: 1.3rem;
    }
  }
</style>