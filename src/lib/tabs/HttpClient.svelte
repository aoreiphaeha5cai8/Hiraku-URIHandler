<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  let url = $state("https://ifconfig.co");
  let method = $state("GET");
  let userAgent = $state("custom");
  let customUserAgent = $state("");
  let response = $state("");
  let isLoading = $state(false);
  let statusCode = $state<number | null>(null);
  let headers = $state<Record<string, string>>({});
  let customHeaders = $state<Array<{key: string, value: string}>>([{key: "", value: ""}]);
  let showHeaders = $state(false);
  let activeResponseTab = $state<'raw' | 'preview'>('raw');

  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"];
  
  const userAgents = {
    "custom": { name: "Custom", value: "" },
    "chrome-windows": { name: "Chrome (Windows)", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    "chrome-mac": { name: "Chrome (macOS)", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    "firefox-windows": { name: "Firefox (Windows)", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0" },
    "firefox-mac": { name: "Firefox (macOS)", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0" },
    "safari-mac": { name: "Safari (macOS)", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15" },
    "safari-ios": { name: "Safari (iOS)", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
    "edge-windows": { name: "Edge (Windows)", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0" },
    "curl": { name: "curl", value: "curl/8.4.0" },
    "wget": { name: "wget", value: "Wget/1.21.4" },
    "googlebot": { name: "Googlebot", value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    "bingbot": { name: "Bingbot", value: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" },
    "yandexbot": { name: "YandexBot", value: "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)" },
    "facebookbot": { name: "Facebook Bot", value: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" },
    "twitterbot": { name: "Twitter Bot", value: "Twitterbot/1.0" },
    "linkedinbot": { name: "LinkedIn Bot", value: "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)" }
  };

  async function makeRequest() {
    if (!url.trim()) {
      alert("Please enter a URL");
      return;
    }

    isLoading = true;
    response = "";
    statusCode = null;
    headers = {};

    try {
      const userAgentValue = userAgent === "custom" ? customUserAgent : userAgents[userAgent as keyof typeof userAgents]?.value;
      
      const customHeadersObj = customHeaders
        .filter(h => h.key.trim() && h.value.trim())
        .reduce((acc, h) => {
          acc[h.key.trim()] = h.value.trim();
          return acc;
        }, {} as Record<string, string>);

      const result = await invoke<{status: number, headers: Record<string, string>, body: string}>(
        "make_http_request", 
        { 
          url: url.trim(), 
          method, 
          userAgent: userAgentValue || undefined,
          customHeaders: Object.keys(customHeadersObj).length > 0 ? customHeadersObj : undefined
        }
      );
      
      statusCode = result.status;
      headers = result.headers;
      response = result.body;
    } catch (error) {
      response = `Error: ${error}`;
      statusCode = null;
    } finally {
      isLoading = false;
    }
  }

  function addCustomHeader() {
    customHeaders = [...customHeaders, {key: "", value: ""}];
  }

  function removeCustomHeader(index: number) {
    customHeaders = customHeaders.filter((_, i) => i !== index);
  }

  function getStatusClass(status: number | null): string {
    if (!status) return "";
    if (status >= 200 && status < 300) return "status-success";
    if (status >= 300 && status < 400) return "status-redirect";
    if (status >= 400 && status < 500) return "status-client-error";
    if (status >= 500) return "status-server-error";
    return "";
  }
</script>

<div class="http-client">
  <div class="request-form">
    <div class="method-url-row">
      <select bind:value={method} class="method-select">
        {#each httpMethods as httpMethod}
          <option value={httpMethod}>{httpMethod}</option>
        {/each}
      </select>
      
      <input 
        type="url" 
        bind:value={url} 
        placeholder="Enter URL (e.g., https://api.github.com/users/octocat)" 
        class="url-input"
      />
      
      <button 
        onclick={makeRequest} 
        disabled={isLoading || !url.trim()} 
        class="send-button"
      >
        {isLoading ? "Sending..." : "Send"}
      </button>
    </div>

    <div class="user-agent-section">
      <label for="user-agent-select">User-Agent:</label>
      <select id="user-agent-select" bind:value={userAgent} class="user-agent-select">
        {#each Object.entries(userAgents) as [key, agent]}
          <option value={key}>{agent.name}</option>
        {/each}
      </select>
      
      {#if userAgent === "custom"}
        <input 
          type="text" 
          bind:value={customUserAgent} 
          placeholder="Enter custom User-Agent" 
          class="custom-user-agent-input"
        />
        <div class="user-agent-preview">
          <strong>Preview:</strong> {customUserAgent || "(empty)"}
        </div>
      {:else}
        <div class="user-agent-preview">
          <strong>Preview:</strong> {userAgents[userAgent as keyof typeof userAgents]?.value || "(none)"}
        </div>
      {/if}
    </div>

    <div class="headers-section">
      <details bind:open={showHeaders}>
        <summary>Custom Headers</summary>
        <div class="custom-headers">
          {#each customHeaders as header, index}
            <div class="header-row">
              <input 
                type="text" 
                bind:value={header.key} 
                placeholder="Header name" 
                class="header-key-input"
              />
              <input 
                type="text" 
                bind:value={header.value} 
                placeholder="Header value" 
                class="header-value-input"
              />
              <button 
                onclick={() => removeCustomHeader(index)} 
                class="remove-header-button"
                disabled={customHeaders.length === 1}
              >
                ×
              </button>
            </div>
          {/each}
          <button onclick={addCustomHeader} class="add-header-button">
            + Add Header
          </button>
        </div>
      </details>
    </div>
  </div>

  {#if isLoading}
    <div class="loading-indicator">
      <div class="spinner"></div>
      <span>Sending {method} request to {url}...</span>
    </div>
  {/if}

  {#if statusCode !== null || response}
    <div class="response-section">
      {#if statusCode !== null}
        <div class="status-header">
          <h3>Response</h3>
          <span class="status-code {getStatusClass(statusCode)}">Status: {statusCode}</span>
        </div>
      {/if}

      {#if Object.keys(headers).length > 0}
        <details>
          <summary class="headers-summary">Response Headers ({Object.keys(headers).length})</summary>
          <div class="response-headers">
            {#each Object.entries(headers) as [key, value]}
              <div class="header-item">
                <strong>{key}:</strong> <span>{value}</span>
              </div>
            {/each}
          </div>
        </details>
      {/if}

      <div class="response-tabs">
        <button 
          class="tab-button" 
          class:active={activeResponseTab === 'raw'}
          onclick={() => activeResponseTab = 'raw'}
        >
          Raw
        </button>
        <button 
          class="tab-button" 
          class:active={activeResponseTab === 'preview'}
          onclick={() => activeResponseTab = 'preview'}
        >
          Preview
        </button>
      </div>

      <div class="response-content">
        {#if activeResponseTab === 'raw'}
          <pre class="response-text">{response}</pre>
        {:else}
          <div class="response-preview">
            {#if headers['content-type']?.includes('application/json')}
              <pre class="json-preview">{JSON.stringify(JSON.parse(response), null, 2)}</pre>
            {:else if headers['content-type']?.includes('text/html')}
              <iframe srcdoc={response} class="html-preview" title="HTML Preview"></iframe>
            {:else}
              <pre class="text-preview">{response}</pre>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .http-client {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .request-form {
    background: var(--card-bg, #ffffff);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid var(--border-color, #e0e0e0);
    margin-bottom: 1.5rem;
  }

  .method-url-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .method-select {
    padding: 0 2.5rem 0 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    font-weight: 500;
    min-width: 100px;
    cursor: pointer;
    height: 2.4rem;
    /* Custom styling */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666666'><path d='M7 10l5 5 5-5z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 18px;
  }

  :global([data-theme="dark"]) .method-select {
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23b0b0b0'><path d='M7 10l5 5 5-5z'/></svg>");
  }

  .method-select:focus {
    outline: 2px solid var(--primary-color, #007acc);
    outline-offset: 2px;
    border-color: var(--primary-color, #007acc);
  }

  .method-select:hover {
    border-color: var(--primary-color, #007acc);
  }

  .method-select option {
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    padding: 8px 12px;
  }

  .url-input {
    flex: 1;
    padding: 0 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    height: 2.4rem;
  }

  .send-button {
    padding: 0 1.5rem;
    background: var(--primary-color, #007acc);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.25s;
    height: 2.4rem;
  }

  .send-button:hover:not(:disabled) {
    background: var(--primary-hover, #005fa3);
  }

  .send-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .user-agent-section {
    margin-bottom: 1rem;
  }

  .user-agent-section label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-color, #333333);
  }

  .user-agent-select {
    width: 100%;
    padding: 0 2.5rem 0 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    margin-bottom: 0.5rem;
    cursor: pointer;
    height: 2.4rem;
    /* Custom styling */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666666'><path d='M7 10l5 5 5-5z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 18px;
  }

  :global([data-theme="dark"]) .user-agent-select {
    background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23b0b0b0'><path d='M7 10l5 5 5-5z'/></svg>");
  }

  .user-agent-select:focus {
    outline: 2px solid var(--primary-color, #007acc);
    outline-offset: 2px;
    border-color: var(--primary-color, #007acc);
  }

  .user-agent-select:hover {
    border-color: var(--primary-color, #007acc);
  }

  .user-agent-select option {
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    padding: 8px 12px;
  }

  .custom-user-agent-input {
    width: 100%;
    padding: 0 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    margin-bottom: 0.5rem;
    height: 2.4rem;
  }

  .user-agent-preview {
    background: var(--secondary-bg, #f5f5f5);
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.9rem;
    word-break: break-all;
  }

  .headers-section summary {
    cursor: pointer;
    font-weight: 500;
    padding: 0.5rem 0;
    color: var(--text-color, #333333);
  }

  .custom-headers {
    margin-top: 1rem;
  }

  .header-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    align-items: center;
  }

  .header-key-input,
  .header-value-input {
    flex: 1;
    padding: 0 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
    height: 2.4rem;
  }

  .remove-header-button {
    background: var(--error-color, #dc3545);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    width: 2.4rem;
    height: 2.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-header-button {
    background: var(--success-color, #28a745);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
    height: 2.4rem;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--info-bg, #e3f2fd);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-top: 2px solid var(--primary-color, #007acc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .response-section {
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 12px;
    overflow: hidden;
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .status-code {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .status-success { background: #d4edda; color: #155724; }
  .status-redirect { background: #fff3cd; color: #856404; }
  .status-client-error { background: #f8d7da; color: #721c24; }
  .status-server-error { background: #f5c6cb; color: #721c24; }

  .headers-summary {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    background: var(--secondary-bg, #f5f5f5);
  }

  .response-headers {
    padding: 1rem 1.5rem;
    background: var(--secondary-bg, #f5f5f5);
  }

  .header-item {
    margin-bottom: 0.5rem;
    font-family: monospace;
    font-size: 0.9rem;
  }

  .response-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .response-tabs .tab-button {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--text-secondary, #666666);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.25s;
  }

  .response-tabs .tab-button.active {
    color: var(--primary-color, #007acc);
    border-bottom-color: var(--primary-color, #007acc);
  }

  .response-content {
    padding: 1.5rem;
  }

  .response-text,
  .json-preview,
  .text-preview {
    background: var(--code-bg, #f8f9fa);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color, #e0e0e0);
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 400px;
    overflow-y: auto;
  }

  .html-preview {
    width: 100%;
    height: 400px;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
  }

  @media (max-width: 768px) {
    .http-client {
      padding: 1rem;
    }

    .method-url-row {
      flex-direction: column;
      align-items: stretch;
    }

    .method-select {
      min-width: unset;
    }

    .status-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .header-row {
      flex-direction: column;
    }

    .remove-header-button {
      align-self: flex-end;
    }
  }
</style>