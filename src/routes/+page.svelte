<script lang="ts">
  import TabNavigation from '../lib/components/TabNavigation.svelte';
  import HttpClient from '../lib/tabs/HttpClient.svelte';
  import NetworkTools from '../lib/tabs/NetworkTools.svelte';
  import RadioPlayer from '../lib/tabs/RadioPlayer.svelte';

  // Tab state
  let activeTab = $state('http-client');
  let theme = $state<'light' | 'dark' | 'system'>('system');

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
  }

  :global(h1, h2, h3, h4, h5, h6) {
    margin: 0;
    line-height: 1.2;
  }

  :global(input, select, textarea, button) {
    font-family: inherit;
    transition: all 0.25s;
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
    padding: 0.5rem 2rem 0.5rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 0.9rem;
    cursor: pointer;
    min-width: 120px;
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