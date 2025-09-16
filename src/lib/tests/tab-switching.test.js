import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import TabNavigation from '../components/TabNavigation.svelte';

// Create a test wrapper component that simulates the main page tab switching
const TabSwitchingTestApp = `
  <script>
    import TabNavigation from '../components/TabNavigation.svelte';
    
    let activeTab = $state('http-client');
    
    const tabs = [
      {
        id: 'http-client',
        name: 'HTTP Client',
        icon: '🌐',
        description: 'Make HTTP requests'
      },
      {
        id: 'network-tools', 
        name: 'Network Tools',
        icon: '🔧',
        description: 'DNS and network utilities'
      },
      {
        id: 'radio-player',
        name: 'Radio Player', 
        icon: '📻',
        description: 'Stream radio stations'
      }
    ];
    
    function handleTabChange(tabId) {
      console.log('Tab switching to:', tabId);
      activeTab = tabId;
    }
  </script>
  
  <div class="test-app">
    <TabNavigation {tabs} {activeTab} onTabChange={handleTabChange} />
    
    <!-- CSS-based tab content rendering -->
    <main class="app-main">
      <div class="tab-content" class:active={activeTab === 'http-client'} data-tab="http-client">
        <div data-testid="http-client-content">HTTP Client Component</div>
      </div>
      
      <div class="tab-content" class:active={activeTab === 'network-tools'} data-tab="network-tools">
        <div data-testid="network-tools-content">Network Tools Component</div>
      </div>
      
      <div class="tab-content" class:active={activeTab === 'radio-player'} data-tab="radio-player">
        <div data-testid="radio-player-content">Radio Player Component</div>
      </div>
    </main>
  </div>
  
  <style>
    .tab-content {
      display: none;
      width: 100%;
      height: 100%;
    }
    
    .tab-content.active {
      display: block;
    }
  </style>
`;

describe('CSS-based Tab Switching', () => {
  let component;
  
  beforeEach(() => {
    // Clear console logs before each test
    vi.clearAllMocks();
    const consoleSpy = vi.spyOn(console, 'log');
    consoleSpy.mockImplementation(() => {});
  });
  
  it('should render all tab content containers in DOM', async () => {
    const { container } = render({
      Component: { render: () => ({ html: TabSwitchingTestApp }) }
    });
    
    // All tab content containers should be present in DOM
    const tabContainers = container.querySelectorAll('.tab-content');
    expect(tabContainers).toHaveLength(3);
    
    // Verify data-tab attributes
    expect(container.querySelector('[data-tab="http-client"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tab="network-tools"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tab="radio-player"]')).toBeInTheDocument();
  });
  
  it('should show only active tab content initially', async () => {
    const { container } = render({
      Component: { render: () => ({ html: TabSwitchingTestApp }) }
    });
    
    // Check initial visibility - HTTP Client should be active
    const httpClientTab = container.querySelector('[data-tab="http-client"]');
    const networkToolsTab = container.querySelector('[data-tab="network-tools"]');
    const radioPlayerTab = container.querySelector('[data-tab="radio-player"]');
    
    expect(httpClientTab).toHaveClass('active');
    expect(networkToolsTab).not.toHaveClass('active');
    expect(radioPlayerTab).not.toHaveClass('active');
    
    // Check computed styles
    const httpStyle = getComputedStyle(httpClientTab);
    const networkStyle = getComputedStyle(networkToolsTab);
    const radioStyle = getComputedStyle(radioPlayerTab);
    
    expect(httpStyle.display).not.toBe('none');
    expect(networkStyle.display).toBe('none');
    expect(radioStyle.display).toBe('none');
  });
  
  it('should switch tab visibility when tab is clicked', async () => {
    const { container } = render({
      Component: { render: () => ({ html: TabSwitchingTestApp }) }
    });
    
    // Click on Network Tools tab
    const networkTabButton = screen.getByRole('button', { name: /Network Tools/ });
    await fireEvent.click(networkTabButton);
    await tick();
    
    // Check that Network Tools is now active
    const httpClientTab = container.querySelector('[data-tab="http-client"]');
    const networkToolsTab = container.querySelector('[data-tab="network-tools"]');
    const radioPlayerTab = container.querySelector('[data-tab="radio-player"]');
    
    expect(httpClientTab).not.toHaveClass('active');
    expect(networkToolsTab).toHaveClass('active');
    expect(radioPlayerTab).not.toHaveClass('active');
    
    // Verify display styles
    const httpStyle = getComputedStyle(httpClientTab);
    const networkStyle = getComputedStyle(networkToolsTab);
    const radioStyle = getComputedStyle(radioPlayerTab);
    
    expect(httpStyle.display).toBe('none');
    expect(networkStyle.display).not.toBe('none');
    expect(radioStyle.display).toBe('none');
  });
  
  it('should maintain all components in DOM during tab switches', async () => {
    const { container } = render({
      Component: { render: () => ({ html: TabSwitchingTestApp }) }
    });
    
    // Initially all content should be in DOM
    expect(screen.getByTestId('http-client-content')).toBeInTheDocument();
    expect(screen.getByTestId('network-tools-content')).toBeInTheDocument();
    expect(screen.getByTestId('radio-player-content')).toBeInTheDocument();
    
    // Switch to Network Tools
    const networkTabButton = screen.getByRole('button', { name: /Network Tools/ });
    await fireEvent.click(networkTabButton);
    await tick();
    
    // All components should still be in DOM (not destroyed)
    expect(screen.getByTestId('http-client-content')).toBeInTheDocument();
    expect(screen.getByTestId('network-tools-content')).toBeInTheDocument();
    expect(screen.getByTestId('radio-player-content')).toBeInTheDocument();
    
    // Switch to Radio Player
    const radioTabButton = screen.getByRole('button', { name: /Radio Player/ });
    await fireEvent.click(radioTabButton);
    await tick();
    
    // Still all components in DOM
    expect(screen.getByTestId('http-client-content')).toBeInTheDocument();
    expect(screen.getByTestId('network-tools-content')).toBeInTheDocument();
    expect(screen.getByTestId('radio-player-content')).toBeInTheDocument();
  });
  
  it('should switch between all tabs correctly', async () => {
    const { container } = render({
      Component: { render: () => ({ html: TabSwitchingTestApp }) }
    });
    
    const tabs = [
      { button: 'HTTP Client', selector: '[data-tab="http-client"]' },
      { button: 'Network Tools', selector: '[data-tab="network-tools"]' }, 
      { button: 'Radio Player', selector: '[data-tab="radio-player"]' }
    ];
    
    // Test switching to each tab
    for (const tab of tabs) {
      const tabButton = screen.getByRole('button', { name: new RegExp(tab.button) });
      await fireEvent.click(tabButton);
      await tick();
      
      // Only this tab should be active
      for (const checkTab of tabs) {
        const tabElement = container.querySelector(checkTab.selector);
        if (checkTab.selector === tab.selector) {
          expect(tabElement).toHaveClass('active');
          expect(getComputedStyle(tabElement).display).not.toBe('none');
        } else {
          expect(tabElement).not.toHaveClass('active');
          expect(getComputedStyle(tabElement).display).toBe('none');
        }
      }
    }
  });
  
  it('should preserve component state during tab switches', async () => {
    // This test would be expanded with actual state management
    // For now, we verify that components remain in DOM to preserve state
    const { container } = render({
      Component: { render: () => ({ html: TabSwitchingTestApp }) }
    });
    
    const httpContent = screen.getByTestId('http-client-content');
    
    // Switch away from HTTP Client
    const networkTabButton = screen.getByRole('button', { name: /Network Tools/ });
    await fireEvent.click(networkTabButton);
    await tick();
    
    // HTTP Client content should still exist (not destroyed)
    expect(httpContent).toBeInTheDocument();
    
    // Switch back to HTTP Client
    const httpTabButton = screen.getByRole('button', { name: /HTTP Client/ });
    await fireEvent.click(httpTabButton);
    await tick();
    
    // Same element should be visible again
    expect(httpContent).toBeInTheDocument();
    expect(container.querySelector('[data-tab="http-client"]')).toHaveClass('active');
  });
  
  it('should handle rapid tab switching gracefully', async () => {
    const { container } = render({
      Component: { render: () => ({ html: TabSwitchingTestApp }) }
    });
    
    const httpButton = screen.getByRole('button', { name: /HTTP Client/ });
    const networkButton = screen.getByRole('button', { name: /Network Tools/ });
    const radioButton = screen.getByRole('button', { name: /Radio Player/ });
    
    // Rapid clicking
    await fireEvent.click(networkButton);
    await fireEvent.click(radioButton);
    await fireEvent.click(httpButton);
    await fireEvent.click(networkButton);
    await tick();
    
    // Final state should be Network Tools active
    expect(container.querySelector('[data-tab="network-tools"]')).toHaveClass('active');
    expect(container.querySelector('[data-tab="http-client"]')).not.toHaveClass('active');
    expect(container.querySelector('[data-tab="radio-player"]')).not.toHaveClass('active');
    
    // All components should still be in DOM
    expect(screen.getByTestId('http-client-content')).toBeInTheDocument();
    expect(screen.getByTestId('network-tools-content')).toBeInTheDocument();
    expect(screen.getByTestId('radio-player-content')).toBeInTheDocument();
  });
});
