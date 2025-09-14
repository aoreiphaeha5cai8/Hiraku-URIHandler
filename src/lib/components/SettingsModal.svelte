<script lang="ts">
  import AudioSettings from './AudioSettings.svelte';
  
  let audioSettingsRef: AudioSettings;
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
  <div class="modal-backdrop" onclick={handleBackdropClick}>
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
        
        <div class="butterchurn-info">
          <h3>🌈 Butterchurn Visualizer</h3>
          <p>
            <a href="#" onclick="window.open('https://github.com/jberg/butterchurn', '_blank')">
              Butterchurn
            </a> is a WebGL implementation of the 
            <a href="#" onclick="window.open('https://www.geisswerks.com/milkdrop/', '_blank')">
              Milkdrop Visualizer
            </a>.
            Licensed under the MIT License.
          </p>
          <div class="preset-controls">
            <p><strong>Keyboard Controls:</strong></p>
            <ul>
              <li><kbd>Space</kbd> or <kbd>→</kbd> - Next preset</li>
              <li><kbd>Backspace</kbd> or <kbd>←</kbd> - Previous preset</li>
              <li><kbd>H</kbd> - Random preset (no blend)</li>
            </ul>
          </div>
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
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--secondary-bg);
    border-radius: 12px;
    border: 1px solid var(--border-color);
  }
  
  .butterchurn-info h3 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.2rem;
  }
  
  .butterchurn-info p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  
  .butterchurn-info a {
    color: var(--primary-color);
    text-decoration: none;
  }
  
  .butterchurn-info a:hover {
    text-decoration: underline;
  }
  
  .preset-controls {
    margin-top: 1rem;
  }
  
  .preset-controls p {
    margin: 0 0 0.5rem 0;
    font-weight: 600;
    color: var(--text-color);
  }
  
  .preset-controls ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
  }
  
  .preset-controls li {
    margin-bottom: 0.25rem;
  }
  
  kbd {
    background: var(--code-bg);
    color: var(--text-color);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: monospace;
    border: 1px solid var(--border-color);
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