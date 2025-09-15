import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TabNavigation from './TabNavigation.svelte';

describe('TabNavigation', () => {
  const mockTabs = [
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

  it('renders all tabs', () => {
    const { getByRole } = render(TabNavigation, {
      props: {
        tabs: mockTabs,
        activeTab: 'http-client',
        onTabChange: vi.fn()
      }
    });

    // Check that all tabs are rendered
    expect(getByRole('button', { name: /HTTP Client/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Network Tools/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Radio Player/ })).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    const { getByRole } = render(TabNavigation, {
      props: {
        tabs: mockTabs,
        activeTab: 'network-tools',
        onTabChange: vi.fn()
      }
    });

    const activeTab = getByRole('button', { name: /Network Tools/ });
    expect(activeTab).toHaveClass('active');
    
    const inactiveTab = getByRole('button', { name: /HTTP Client/ });
    expect(inactiveTab).not.toHaveClass('active');
  });

  it('calls onTabChange when tab is clicked', async () => {
    const onTabChange = vi.fn();
    const { getByRole } = render(TabNavigation, {
      props: {
        tabs: mockTabs,
        activeTab: 'http-client',
        onTabChange
      }
    });

    const networkToolsTab = getByRole('button', { name: /Network Tools/ });
    await fireEvent.click(networkToolsTab);

    expect(onTabChange).toHaveBeenCalledWith('network-tools');
  });

  it('renders settings button', () => {
    const onSettingsClick = vi.fn();
    const { getByRole } = render(TabNavigation, {
      props: {
        tabs: mockTabs,
        activeTab: 'http-client',
        onTabChange: vi.fn(),
        onSettingsClick
      }
    });

    const settingsButton = getByRole('button', { name: /Settings/ });
    expect(settingsButton).toBeInTheDocument();
  });

  it('calls onSettingsClick when settings button is clicked', async () => {
    const onSettingsClick = vi.fn();
    const { getByRole } = render(TabNavigation, {
      props: {
        tabs: mockTabs,
        activeTab: 'http-client',
        onTabChange: vi.fn(),
        onSettingsClick
      }
    });

    const settingsButton = getByRole('button', { name: /Settings/ });
    await fireEvent.click(settingsButton);

    expect(onSettingsClick).toHaveBeenCalled();
  });

  it('shows tab descriptions in title attributes', () => {
    const { getByRole } = render(TabNavigation, {
      props: {
        tabs: mockTabs,
        activeTab: 'http-client',
        onTabChange: vi.fn()
      }
    });

    const httpTab = getByRole('button', { name: /HTTP Client/ });
    expect(httpTab).toHaveAttribute('title', 'Make HTTP requests');
    
    const networkTab = getByRole('button', { name: /Network Tools/ });
    expect(networkTab).toHaveAttribute('title', 'DNS and network utilities');
  });
});
