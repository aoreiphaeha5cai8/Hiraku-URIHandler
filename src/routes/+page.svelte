<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  let url = $state("");
  let method = $state("GET");
  let userAgent = $state("custom");
  let customUserAgent = $state("");
  let response = $state("");
  let isLoading = $state(false);
  let statusCode = $state<number | null>(null);
  let headers = $state<Record<string, string>>({});

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
  
  function getEffectiveUserAgent(): string {
    if (userAgent === "custom") {
      return customUserAgent.trim();
    }
    return userAgents[userAgent as keyof typeof userAgents]?.value || "";
  }

  async function makeRequest(event: Event) {
    event.preventDefault();
    
    if (!url.trim()) {
      response = "Please enter a URL";
      return;
    }

    isLoading = true;
    response = "";
    statusCode = null;
    headers = {};

    try {
      const effectiveUserAgent = getEffectiveUserAgent();
      const result = await invoke("make_http_request", { 
        url: url.trim(), 
        method, 
        userAgent: effectiveUserAgent || null 
      });
      
      if (result && typeof result === 'object') {
        const httpResponse = result as { status: number; headers: Record<string, string>; body: string };
        statusCode = httpResponse.status;
        headers = httpResponse.headers;
        response = httpResponse.body;
      } else {
        response = "Unexpected response format";
      }
    } catch (error) {
      response = `Error: ${error}`;
      statusCode = null;
    } finally {
      isLoading = false;
    }
  }

  function getStatusColor(status: number | null): string {
    if (!status) return "";
    if (status >= 200 && status < 300) return "success";
    if (status >= 400 && status < 500) return "client-error";
    if (status >= 500) return "server-error";
    return "info";
  }
</script>

<main class="container">
  <h1>HTTP Client</h1>

  <form class="request-form" onsubmit={makeRequest}>
    <div class="url-row">
      <select bind:value={method} class="method-select">
        {#each httpMethods as httpMethod}
          <option value={httpMethod}>{httpMethod}</option>
        {/each}
      </select>
      <input 
        type="url" 
        placeholder="Enter URL (e.g., https://api.github.com/users/octocat)" 
        bind:value={url} 
        class="url-input"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Loading..." : "Send Request"}
      </button>
    </div>
    
    <div class="user-agent-row">
      <label for="user-agent-select">User-Agent:</label>
      <select bind:value={userAgent} id="user-agent-select" class="user-agent-select">
        {#each Object.entries(userAgents) as [key, ua]}
          <option value={key}>{ua.name}</option>
        {/each}
      </select>
      {#if userAgent === "custom"}
        <input 
          type="text" 
          placeholder="Enter custom User-Agent" 
          bind:value={customUserAgent} 
          class="custom-user-agent-input"
        />
      {:else}
        <input 
          type="text" 
          value={userAgents[userAgent as keyof typeof userAgents]?.value || ""} 
          class="user-agent-preview"
          readonly
        />
      {/if}
    </div>
  </form>

  {#if statusCode !== null}
    <div class="status-info">
      <span class="status-code {getStatusColor(statusCode)}">Status: {statusCode}</span>
      {#if Object.keys(headers).length > 0}
        <details class="headers-details">
          <summary>Response Headers ({Object.keys(headers).length})</summary>
          <div class="headers-list">
            {#each Object.entries(headers) as [key, value]}
              <div class="header-item">
                <span class="header-key">{key}:</span>
                <span class="header-value">{value}</span>
              </div>
            {/each}
          </div>
        </details>
      {/if}
    </div>
  {/if}

  {#if response}
    <div class="response-section">
      <h3>Response Body:</h3>
      <pre class="response-body">{response}</pre>
    </div>
  {/if}
</main>

<style>
.request-form {
  margin: 2rem 0;
  width: 100%;
  max-width: 800px;
}

.url-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.method-select {
  min-width: 100px;
  padding: 0.6em 1.2em;
  border-radius: 8px;
  border: 1px solid #ccc;
  background-color: #ffffff;
  font-size: 1em;
  font-family: inherit;
}

.url-input {
  flex: 1;
  min-width: 300px;
}

.user-agent-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.user-agent-row label {
  font-weight: 500;
  min-width: 80px;
}

.user-agent-select {
  min-width: 200px;
  padding: 0.6em 1.2em;
  border-radius: 8px;
  border: 1px solid #ccc;
  background-color: #ffffff;
  font-size: 1em;
  font-family: inherit;
}

.custom-user-agent-input,
.user-agent-preview {
  flex: 1;
  min-width: 200px;
  padding: 0.6em 1.2em;
  border-radius: 8px;
  border: 1px solid #ccc;
  background-color: #ffffff;
  font-size: 1em;
  font-family: inherit;
  font-family: monospace;
  font-size: 0.9em;
}

.user-agent-preview {
  background-color: #f8f8f8;
  color: #666;
  cursor: not-allowed;
}

.status-info {
  margin: 1rem 0;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  text-align: left;
}

.status-code {
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-right: 1rem;
}

.status-code.success {
  background-color: #d4edda;
  color: #155724;
}

.status-code.client-error {
  background-color: #f8d7da;
  color: #721c24;
}

.status-code.server-error {
  background-color: #f5c6cb;
  color: #721c24;
}

.status-code.info {
  background-color: #d1ecf1;
  color: #0c5460;
}

.headers-details {
  margin-top: 1rem;
}

.headers-details summary {
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.headers-list {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 1rem;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.header-item {
  margin-bottom: 0.25rem;
  font-family: monospace;
  font-size: 0.9em;
}

.header-key {
  color: #666;
  margin-right: 0.5rem;
}

.header-value {
  color: #333;
}

.response-section {
  margin-top: 2rem;
  text-align: left;
}

.response-section h3 {
  margin-bottom: 0.5rem;
}

.response-body {
  background-color: #f4f4f4;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  border: 1px solid #ddd;
}

:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}



.row {
  display: flex;
  justify-content: center;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

a:hover {
  color: #535bf2;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}
button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

@media (max-width: 768px) {
  .url-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .method-select,
  .url-input {
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .user-agent-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .user-agent-row label {
    margin-bottom: 0.25rem;
  }
  
  .user-agent-select,
  .custom-user-agent-input,
  .user-agent-preview {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  a:hover {
    color: #24c8db;
  }

  input,
  button,
  .method-select,
  .user-agent-select {
    color: #ffffff;
    background-color: #0f0f0f98;
    border-color: #555;
  }
  
  .user-agent-preview {
    background-color: rgba(255, 255, 255, 0.05);
    color: #aaa;
  }
  
  button:active {
    background-color: #0f0f0f69;
  }
  
  .status-info {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .headers-list {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .header-key {
    color: #aaa;
  }
  
  .header-value {
    color: #fff;
  }
  
  .response-body {
    background-color: #1e1e1e;
    color: #f6f6f6;
    border-color: #555;
  }
}

</style>
