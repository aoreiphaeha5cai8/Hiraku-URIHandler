<script lang="ts">
  interface Tab {
    id: string;
    name: string;
    icon: string;
    description: string;
  }

  interface Props {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
  }

  let { tabs, activeTab, onTabChange }: Props = $props();
</script>

<nav class="tab-navigation">
  <div class="tab-list">
    {#each tabs as tab}
      <button 
        class="tab-button" 
        class:active={activeTab === tab.id}
        onclick={() => onTabChange(tab.id)}
        title={tab.description}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-name">{tab.name}</span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .tab-navigation {
    background: var(--card-bg, #ffffff);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    padding: 0 1rem;
    overflow-x: auto;
  }

  .tab-list {
    display: flex;
    gap: 0.5rem;
    min-height: 60px;
    align-items: center;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: var(--text-secondary, #666666);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    transition: all 0.25s ease;
    white-space: nowrap;
    position: relative;
  }

  .tab-button:hover {
    background: var(--hover-bg, #f5f5f5);
    color: var(--text-color, #333333);
  }

  .tab-button.active {
    background: var(--primary-color, #007acc);
    color: white;
  }

  .tab-button.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--primary-color, #007acc);
  }

  .tab-icon {
    font-size: 1.1rem;
    display: flex;
    align-items: center;
  }

  .tab-name {
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .tab-navigation {
      padding: 0 0.5rem;
    }
    
    .tab-button {
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
    }
    
    .tab-name {
      display: none;
    }
    
    .tab-icon {
      font-size: 1.2rem;
    }
  }
</style>