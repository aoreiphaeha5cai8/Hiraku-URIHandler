import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import HttpClient from './HttpClient.svelte';

describe('HttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the HTTP client interface', () => {
    const { getByLabelText, getByPlaceholderText, getByRole } = render(HttpClient);

    // Check main elements are present
    expect(getByPlaceholderText(/Enter URL/)).toBeInTheDocument();
    expect(getByRole('button', { name: /Send/ })).toBeInTheDocument();
    expect(getByLabelText(/User-Agent/)).toBeInTheDocument();
  });

  it('has all HTTP methods available', () => {
    const { getByDisplayValue } = render(HttpClient);
    
    const methodSelect = getByDisplayValue('GET');
    expect(methodSelect).toBeInTheDocument();
    
    // Check that the select has the expected options
    const options = methodSelect.querySelectorAll('option');
    const methods = Array.from(options).map(option => option.value);
    
    expect(methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']);
  });

  it('shows user agent presets', () => {
    const { getByDisplayValue } = render(HttpClient);
    
    const userAgentSelect = getByDisplayValue('Custom');
    expect(userAgentSelect).toBeInTheDocument();
  });

  it('shows custom user agent input when Custom is selected', async () => {
    const { getByDisplayValue, getByPlaceholderText } = render(HttpClient);
    
    // Custom should be selected by default
    const customInput = getByPlaceholderText(/Enter custom User-Agent/);
    expect(customInput).toBeInTheDocument();
  });

  it('disables send button when URL is empty', () => {
    const { getByRole } = render(HttpClient);
    
    const sendButton = getByRole('button', { name: /Send/ });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when URL is provided', async () => {
    const { getByRole, getByPlaceholderText } = render(HttpClient);
    
    const urlInput = getByPlaceholderText(/Enter URL/);
    const sendButton = getByRole('button', { name: /Send/ });
    
    await fireEvent.input(urlInput, { target: { value: 'https://example.com' } });
    
    expect(sendButton).not.toBeDisabled();
  });

  it('makes HTTP request when send button is clicked', async () => {
    const { getByRole, getByPlaceholderText } = render(HttpClient);
    
    const urlInput = getByPlaceholderText(/Enter URL/);
    const sendButton = getByRole('button', { name: /Send/ });
    
    await fireEvent.input(urlInput, { target: { value: 'https://example.com' } });
    await fireEvent.click(sendButton);
    
    // Should show loading state
    await waitFor(() => {
      expect(getByRole('button', { name: /Sending/ })).toBeInTheDocument();
    });
  });

  it('displays response when request succeeds', async () => {
    const { getByRole, getByPlaceholderText, getByText } = render(HttpClient);
    
    const urlInput = getByPlaceholderText(/Enter URL/);
    const sendButton = getByRole('button', { name: /Send/ });
    
    await fireEvent.input(urlInput, { target: { value: 'https://example.com' } });
    await fireEvent.click(sendButton);
    
    // Wait for response
    await waitFor(() => {
      expect(getByText(/Status: 200/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('can add custom headers', async () => {
    const { getByRole } = render(HttpClient);
    
    const addHeaderButton = getByRole('button', { name: /Add Header/ });
    await fireEvent.click(addHeaderButton);
    
    // Should have 2 header rows now (1 default + 1 added)
    const headerInputs = document.querySelectorAll('.header-key-input');
    expect(headerInputs).toHaveLength(2);
  });

  it('can remove custom headers', async () => {
    const { getByRole } = render(HttpClient);
    
    const addHeaderButton = getByRole('button', { name: /Add Header/ });
    await fireEvent.click(addHeaderButton);
    
    const removeButtons = document.querySelectorAll('.remove-header-button');
    await fireEvent.click(removeButtons[0]);
    
    // Should be back to 1 header row
    const headerInputs = document.querySelectorAll('.header-key-input');
    expect(headerInputs).toHaveLength(1);
  });

  it('prevents removing the last header row', () => {
    const { } = render(HttpClient);
    
    const removeButton = document.querySelector('.remove-header-button');
    expect(removeButton).toBeDisabled();
  });
});
