import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MainPage from './+page.svelte';

// Mock the components to avoid complex dependencies
vi.mock('../lib/tabs/HttpClient.svelte', () => ({
  default: () => ({ $$: { fragment: null, ctx: null }, $set: () => {}, $on: () => {}, $destroy: () => {} })
}));

vi.mock('../lib/tabs/NetworkTools.svelte', () => ({
  default: () => ({ $$: { fragment: null, ctx: null }, $set: () => {}, $on: () => {}, $destroy: () => {} })
}));

vi.mock('../lib/tabs/RadioPlayer.svelte', () => ({
  default: () => ({ $$: { fragment: null, ctx: null }, $set: () => {}, $on: () => {}, $destroy: () => {} })
}));

vi.mock('../lib/components/SettingsModal.svelte', () => ({
  default: () => ({ $$: { fragment: null, ctx: null }, $set: () => {}, $on: () => {}, $destroy: () => {} })
}));

describe('Main Page Tab Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main application', () => {
    const { getByText, getByRole } = render(MainPage);

    // Check header elements
    expect(getByText('Network Toolkit')).toBeInTheDocument();
    expect(getByText('Professional HTTP client and network utilities')).toBeInTheDocument();
    
    // Check theme selector
    expect(getByRole('combobox', { name: /Theme/ })).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    const { getByRole } = render(MainPage);

    expect(getByRole('button', { name: /HTTP Client/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Network Tools/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Radio Player/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Settings/ })).toBeInTheDocument();
  });

  it('starts with HTTP Client tab active', () => {
    const { getByRole } = render(MainPage);
    
    const httpClientTab = getByRole('button', { name: /HTTP Client/ });
    expect(httpClientTab).toHaveClass('active');
  });

  it('can switch between tabs', async () => {
    const { getByRole } = render(MainPage);
    
    const httpClientTab = getByRole('button', { name: /HTTP Client/ });
    const networkToolsTab = getByRole('button', { name: /Network Tools/ });
    
    // Initially HTTP Client should be active
    expect(httpClientTab).toHaveClass('active');
    expect(networkToolsTab).not.toHaveClass('active');
    
    // Click Network Tools tab
    await fireEvent.click(networkToolsTab);
    
    // Network Tools should now be active
    expect(networkToolsTab).toHaveClass('active');
    expect(httpClientTab).not.toHaveClass('active');
  });

  it('can switch to Radio Player tab', async () => {
    const { getByRole } = render(MainPage);
    
    const radioPlayerTab = getByRole('button', { name: /Radio Player/ });
    
    await fireEvent.click(radioPlayerTab);
    
    expect(radioPlayerTab).toHaveClass('active');
  });

  it('changes theme when theme selector is used', async () => {
    const { getByDisplayValue } = render(MainPage);
    
    const themeSelect = getByDisplayValue('System');
    
    await fireEvent.change(themeSelect, { target: { value: 'dark' } });
    
    expect(themeSelect.value).toBe('dark');
  });

  it('renders footer', () => {
    const { getByText } = render(MainPage);
    
    expect(getByText(/Built with .* using Tauri, SvelteKit, and Rust/)).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    const { getByRole } = render(MainPage);
    
    // Tab buttons should have proper titles
    const httpClientTab = getByRole('button', { name: /HTTP Client/ });
    expect(httpClientTab).toHaveAttribute('title');
    
    const networkToolsTab = getByRole('button', { name: /Network Tools/ });
    expect(networkToolsTab).toHaveAttribute('title');
    
    const radioPlayerTab = getByRole('button', { name: /Radio Player/ });
    expect(radioPlayerTab).toHaveAttribute('title');
  });
});

describe('Tab State Management', () => {
  it('maintains tab state correctly during navigation', async () => {
    const { getByRole } = render(MainPage);
    
    const tabs = [
      getByRole('button', { name: /HTTP Client/ }),
      getByRole('button', { name: /Network Tools/ }),
      getByRole('button', { name: /Radio Player/ })
    ];
    
    // Test each tab activation
    for (let i = 0; i < tabs.length; i++) {
      await fireEvent.click(tabs[i]);
      
      // Only the clicked tab should be active
      tabs.forEach((tab, index) => {
        if (index === i) {
          expect(tab).toHaveClass('active');
        } else {
          expect(tab).not.toHaveClass('active');
        }
      });
    }
  });

  it('handles rapid tab switching', async () => {
    const { getByRole } = render(MainPage);
    
    const httpClientTab = getByRole('button', { name: /HTTP Client/ });
    const networkToolsTab = getByRole('button', { name: /Network Tools/ });
    const radioPlayerTab = getByRole('button', { name: /Radio Player/ });
    
    // Rapidly switch between tabs
    await fireEvent.click(networkToolsTab);
    await fireEvent.click(radioPlayerTab);
    await fireEvent.click(httpClientTab);
    await fireEvent.click(networkToolsTab);
    
    // Final state should be Network Tools active
    expect(networkToolsTab).toHaveClass('active');
    expect(httpClientTab).not.toHaveClass('active');
    expect(radioPlayerTab).not.toHaveClass('active');
  });
});
