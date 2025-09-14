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
  let theme = $state<"light" | "dark" | "system">("system");
  let showHeaders = $state(false);
  let dnsHostname = $state("");
  let dnsResult = $state<Array<{hostname: string, ip_addresses: string[], record_type: string, ttl?: number}>>([]);
  let isDnsLoading = $state(false);
  let urlToClean = $state("");
  let cleanedUrl = $state("");
  let whoisDomain = $state("");
  let whoisResult = $state("");
  let isWhoisLoading = $state(false);
  let geoIp = $state("");
  let geoResult = $state<{ip: string, country?: string, city?: string, region?: string, org?: string} | null>(null);
  let isGeoLoading = $state(false);

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
  
  function addHeader() {
    customHeaders = [...customHeaders, {key: "", value: ""}];
  }
  
  function removeHeader(index: number) {
    if (customHeaders.length > 1) {
      customHeaders = customHeaders.filter((_, i) => i !== index);
    }
  }
  
  function getCustomHeadersObject(): Record<string, string> {
    const headersObj: Record<string, string> = {};
    customHeaders.forEach(header => {
      if (header.key.trim() && header.value.trim()) {
        headersObj[header.key.trim()] = header.value.trim();
      }
    });
    return headersObj;
  }
  
  function applySystemTheme() {
    const root = document.documentElement;
    const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // System automatically detects dark/light preference
    
    if (isDarkSystem) {
      // Dark system theme
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#f6f6f6');
      root.style.setProperty('--border-color', '#555');
      root.style.setProperty('--input-bg', '#2d2d2d');
      root.style.setProperty('--button-bg', '#2d2d2d');
      root.style.setProperty('--select-bg', '#2d2d2d');
      root.style.setProperty('--select-text', '#f6f6f6');
    } else {
      // Light system theme  
      root.style.setProperty('--bg-color', '#f6f6f6');
      root.style.setProperty('--text-color', '#0f0f0f');
      root.style.setProperty('--border-color', '#ccc');
      root.style.setProperty('--input-bg', '#ffffff');
      root.style.setProperty('--button-bg', '#ffffff');
      root.style.setProperty('--select-bg', '#ffffff');
      root.style.setProperty('--select-text', '#0f0f0f');
    }
  }

  function applyTheme() {
    const root = document.documentElement;
    
    if (theme === "dark") {
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#f6f6f6');
      root.style.setProperty('--border-color', '#555');
      root.style.setProperty('--input-bg', '#2d2d2d');
      root.style.setProperty('--button-bg', '#2d2d2d');
      root.style.setProperty('--select-bg', '#2d2d2d');
      root.style.setProperty('--select-text', '#f6f6f6');
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
    } else if (theme === "light") {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#0f0f0f');
      root.style.setProperty('--border-color', '#ddd');
      root.style.setProperty('--input-bg', '#ffffff');
      root.style.setProperty('--button-bg', '#ffffff');
      root.style.setProperty('--select-bg', '#ffffff');
      root.style.setProperty('--select-text', '#0f0f0f');
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
    } else {
      // System theme - follow system preferences
      applySystemTheme();
      root.classList.remove("dark-theme", "light-theme");
    }
  }
  
  // Apply theme on mount and change
  $effect(() => {
    if (typeof document !== 'undefined') {
      applyTheme();
    }
  });
  
  // Listen for system theme changes when in system mode
  $effect(() => {
    if (typeof window !== 'undefined' && theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (theme === 'system') {
          applySystemTheme();
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  });

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
      const headersObj = getCustomHeadersObject();
      const result = await invoke("make_http_request", { 
        url: url.trim(), 
        method, 
        userAgent: effectiveUserAgent || null,
        customHeaders: Object.keys(headersObj).length > 0 ? headersObj : null
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

  async function resolveDns(event: Event) {
    event.preventDefault();
    
    if (!dnsHostname.trim()) {
      return;
    }

    isDnsLoading = true;
    dnsResult = [];

    try {
      const result = await invoke("resolve_dns", { hostname: dnsHostname.trim() });
      if (Array.isArray(result)) {
        dnsResult = result;
      }
    } catch (error) {
      console.error('DNS resolution error:', error);
      dnsResult = [];
    } finally {
      isDnsLoading = false;
    }
  }

  function cleanUrl(event: Event) {
    event.preventDefault();
    
    if (!urlToClean.trim()) {
      cleanedUrl = "";
      return;
    }

    try {
      const url = new URL(urlToClean.trim());
      
      // List of common tracking parameters to remove
      const trackingParams = [
        // UTM parameters
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        // Facebook tracking
        'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
        // Google tracking
        'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
        // Twitter tracking
        'twclid', 'twttr',
        // LinkedIn tracking
        'li_fat_id',
        // TikTok tracking
        'ttclid',
        // Microsoft tracking
        'msclkid',
        // Amazon tracking
        'tag', 'ref', 'ref_',
        // Email tracking
        'mc_eid', 'mc_cid',
        // General tracking
        '_ga', '_gl', '_ke', 'yclid', 'zanpid', 'igshid',
        // Other common ones
        'si', 'feature', 'app', 'ved', 'usg', 'sa',
        // Social media
        's', 't', 'share', 'shared',
        // Analytics
        'source', 'medium', 'campaign',
        // Referral tracking
        'referrer', 'ref_src', 'ref_url'
      ];

      // Remove tracking parameters
      trackingParams.forEach(param => {
        url.searchParams.delete(param);
      });

      cleanedUrl = url.toString();
    } catch (error) {
      console.error('URL cleaning error:', error);
      cleanedUrl = "Invalid URL format";
    }
  }

  function copyCleanedUrl() {
    if (cleanedUrl && cleanedUrl !== "Invalid URL format") {
      navigator.clipboard.writeText(cleanedUrl).then(() => {
        console.log('URL copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy URL:', err);
      });
    }
  }

  async function lookupWhois(event: Event) {
    event.preventDefault();
    
    if (!whoisDomain.trim()) {
      whoisResult = "";
      return;
    }

    isWhoisLoading = true;
    whoisResult = "";

    try {
      const result = await invoke("whois_lookup", { domain: whoisDomain.trim() });
      if (typeof result === 'string') {
        whoisResult = result;
      }
    } catch (error) {
      console.error('WHOIS lookup error:', error);
      whoisResult = `Error: ${error}`;
    } finally {
      isWhoisLoading = false;
    }
  }

  async function lookupGeolocation(event: Event) {
    event.preventDefault();
    
    if (!geoIp.trim()) {
      geoResult = null;
      return;
    }

    isGeoLoading = true;
    geoResult = null;

    try {
      const result = await invoke("geoip_lookup", { ip: geoIp.trim() });
      if (result && typeof result === 'object') {
        geoResult = result as {ip: string, country?: string, city?: string, region?: string, org?: string};
      }
    } catch (error) {
      console.error('Geolocation lookup error:', error);
      geoResult = { ip: geoIp.trim(), country: `Error: ${error}` };
    } finally {
      isGeoLoading = false;
    }
  }
</script>

<main class="container">
  <div class="header">
    <h1>HTTP Client</h1>
    <div class="theme-switcher">
      <select bind:value={theme} class="theme-select">
        <option value="system">🔄 System</option>
        <option value="light">☀️ Light</option>
        <option value="dark">🌙 Dark</option>
      </select>
    </div>
  </div>

  <form class="request-form" onsubmit={makeRequest}>
    <div class="url-row">
      <select bind:value={method} class="method-select">
        {#each httpMethods as httpMethod}
          <option value={httpMethod}>{httpMethod}</option>
        {/each}
      </select>
      <input 
        type="url" 
        placeholder="Enter URL (e.g., https://ifconfig.co)" 
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
    
    <div class="headers-section">
      <div class="headers-toggle">
        <label>
          <input type="checkbox" bind:checked={showHeaders} />
          Custom Headers
        </label>
      </div>
      
      {#if showHeaders}
        <div class="custom-headers">
          {#each customHeaders as header, index}
            <div class="header-row">
              <input 
                type="text" 
                placeholder="Header name" 
                bind:value={header.key} 
                class="header-key-input"
              />
              <input 
                type="text" 
                placeholder="Header value" 
                bind:value={header.value} 
                class="header-value-input"
              />
              <button 
                type="button" 
                onclick={() => removeHeader(index)} 
                class="remove-header-btn"
                disabled={customHeaders.length === 1}
              >
                ❌
              </button>
            </div>
          {/each}
          <button type="button" onclick={addHeader} class="add-header-btn">
            ➕ Add Header
          </button>
        </div>
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

  <div class="dns-section">
    <h2>DNS Resolution</h2>
    <form class="dns-form" onsubmit={resolveDns}>
      <div class="dns-input-row">
        <input 
          type="text" 
          placeholder="Enter hostname (e.g., google.com)" 
          bind:value={dnsHostname} 
          class="dns-input"
          required
        />
        <button type="submit" disabled={isDnsLoading} class="dns-button">
          {isDnsLoading ? "Resolving..." : "Resolve DNS"}
        </button>
      </div>
    </form>

    {#if dnsResult.length > 0}
      <div class="dns-results">
        <h3>DNS Records:</h3>
        <div class="dns-records">
          {#each dnsResult as record}
            <div class="dns-record">
              <div class="dns-record-type">{record.record_type}</div>
              <div class="dns-record-details">
                <div class="dns-hostname">{record.hostname}</div>
                <div class="dns-ips">
                  {#each record.ip_addresses as ip}
                    <span class="dns-ip">{ip}</span>
                  {/each}
                </div>
                {#if record.ttl}
                  <div class="dns-ttl">TTL: {record.ttl}s</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="url-cleaner-section">
    <h2>URL Cleaner</h2>
    <p class="url-cleaner-description">Remove tracking parameters (UTM, Facebook, Google, etc.) from URLs</p>
    
    <form class="url-cleaner-form" onsubmit={cleanUrl}>
      <div class="url-cleaner-input-row">
        <input 
          type="url" 
          placeholder="Enter URL to clean (e.g., https://example.com?utm_source=google&fbclid=123)" 
          bind:value={urlToClean} 
          class="url-cleaner-input"
          required
        />
        <button type="submit" class="url-cleaner-button">
          Clean URL
        </button>
      </div>
    </form>

    {#if cleanedUrl}
      <div class="url-cleaner-results">
        <h3>Cleaned URL:</h3>
        <div class="cleaned-url-container">
          <div class="cleaned-url-display">
            {#if cleanedUrl === "Invalid URL format"}
              <span class="error-message">{cleanedUrl}</span>
            {:else}
              <span class="cleaned-url-text">{cleanedUrl}</span>
            {/if}
          </div>
          {#if cleanedUrl !== "Invalid URL format"}
            <button type="button" onclick={copyCleanedUrl} class="copy-url-button">
              📋 Copy
            </button>
          {/if}
        </div>
        
        {#if cleanedUrl !== "Invalid URL format" && cleanedUrl !== urlToClean.trim()}
          <div class="url-comparison">
            <div class="url-diff">
              <strong>Parameters removed:</strong>
              <span class="removed-params">URL was cleaned successfully</span>
            </div>
          </div>
        {:else if cleanedUrl === urlToClean.trim()}
          <div class="url-comparison">
            <div class="no-changes">
              <strong>No tracking parameters found</strong> - URL is already clean
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="whois-section">
    <h2>WHOIS Lookup</h2>
    <p class="whois-description">Get domain registration information and ownership details</p>
    
    <form class="whois-form" onsubmit={lookupWhois}>
      <div class="whois-input-row">
        <input 
          type="text" 
          placeholder="Enter domain (e.g., google.com)" 
          bind:value={whoisDomain} 
          class="whois-input"
          required
        />
        <button type="submit" disabled={isWhoisLoading} class="whois-button">
          {isWhoisLoading ? "Looking up..." : "WHOIS Lookup"}
        </button>
      </div>
    </form>

    {#if whoisResult}
      <div class="whois-results">
        <h3>WHOIS Information:</h3>
        <div class="whois-display">
          <pre class="whois-text">{whoisResult}</pre>
        </div>
      </div>
    {/if}
  </div>

  <div class="geo-section">
    <h2>IP Geolocation</h2>
    <p class="geo-description">Get geographical location information for an IP address</p>
    
    <form class="geo-form" onsubmit={lookupGeolocation}>
      <div class="geo-input-row">
        <input 
          type="text" 
          placeholder="Enter IP address (e.g., 8.8.8.8)" 
          bind:value={geoIp} 
          class="geo-input"
          required
        />
        <button type="submit" disabled={isGeoLoading} class="geo-button">
          {isGeoLoading ? "Looking up..." : "Geo Lookup"}
        </button>
      </div>
    </form>

    {#if geoResult}
      <div class="geo-results">
        <h3>Geolocation Information:</h3>
        <div class="geo-info-cards">
          <div class="geo-info-card">
            <div class="geo-info-label">IP Address</div>
            <div class="geo-info-value">{geoResult.ip}</div>
          </div>
          {#if geoResult.country}
            <div class="geo-info-card">
              <div class="geo-info-label">Country</div>
              <div class="geo-info-value">{geoResult.country}</div>
            </div>
          {/if}
          {#if geoResult.region}
            <div class="geo-info-card">
              <div class="geo-info-label">Region</div>
              <div class="geo-info-value">{geoResult.region}</div>
            </div>
          {/if}
          {#if geoResult.city}
            <div class="geo-info-card">
              <div class="geo-info-label">City</div>
              <div class="geo-info-value">{geoResult.city}</div>
            </div>
          {/if}
          {#if geoResult.org}
            <div class="geo-info-card">
              <div class="geo-info-label">Organization</div>
              <div class="geo-info-value">{geoResult.org}</div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
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
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--select-bg) !important;
  color: var(--select-text) !important;
  font-size: 1em;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.url-input {
  flex: 1;
  min-width: 300px;
  height: 3rem;
  padding: 0 1.2em;
  box-sizing: border-box;
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
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--select-bg) !important;
  color: var(--select-text) !important;
  font-size: 1em;
  font-family: inherit;
  cursor: pointer;
  box-sizing: border-box;
}

.custom-user-agent-input,
.user-agent-preview {
  flex: 1;
  min-width: 200px;
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 0.9em;
  font-family: monospace;
  box-sizing: border-box;
}

.user-agent-preview {
  background-color: color-mix(in srgb, var(--input-bg) 70%, var(--bg-color) 30%);
  color: color-mix(in srgb, var(--text-color) 70%, transparent 30%);
  cursor: not-allowed;
}

.status-info {
  margin: 1rem 0;
  padding: 1rem;
  background-color: color-mix(in srgb, var(--bg-color) 95%, var(--text-color) 5%);
  border-radius: 8px;
  text-align: left;
  border: 1px solid var(--border-color);
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
  background-color: var(--input-bg);
  padding: 1rem;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  margin: 0.5rem 0;
}

.header-item {
  margin-bottom: 0.25rem;
  font-family: monospace;
  font-size: 0.9em;
}

.header-key {
  color: color-mix(in srgb, var(--text-color) 70%, transparent 30%);
  margin-right: 0.5rem;
}

.header-value {
  color: var(--text-color);
}

.response-section {
  margin-top: 2rem;
  text-align: left;
  width: 100%;
}

.response-section h3 {
  margin-bottom: 0.5rem;
}

.response-body {
  background-color: var(--input-bg);
  color: var(--text-color);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  border: 1px solid var(--border-color);
  margin: 0;
  line-height: 1.4;
  tab-size: 2;
  width: 100%;
  box-sizing: border-box;
}

:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  
  --bg-color: #f6f6f6;
  --text-color: #0f0f0f;
  --border-color: #ccc;
  --input-bg: #ffffff;
  --button-bg: #ffffff;
  --button-hover: #396cd8;
  --select-bg: #ffffff;
  --select-text: #0f0f0f;

  color: var(--text-color);
  background-color: var(--bg-color);
  transition: background-color 0.3s ease, color 0.3s ease;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.light-theme {
  --bg-color: #ffffff;
  --text-color: #0f0f0f;
  --border-color: #ddd;
  --input-bg: #ffffff;
  --button-bg: #ffffff;
  --select-bg: #ffffff;
  --select-text: #0f0f0f;
}

.dark-theme {
  --bg-color: #1a1a1a !important;
  --text-color: #f6f6f6 !important;
  --border-color: #555 !important;
  --input-bg: #2d2d2d !important;
  --button-bg: #2d2d2d !important;
  --select-bg: #2d2d2d !important;
  --select-text: #f6f6f6 !important;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light-theme):not(.dark-theme) {
    --bg-color: #1a1a1a;
    --text-color: #f6f6f6;
    --border-color: #555;
    --input-bg: #2d2d2d;
    --button-bg: #2d2d2d;
    --select-bg: #2d2d2d;
    --select-text: #f6f6f6;
  }
}

.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
}

.theme-switcher {
  display: flex;
  align-items: center;
}

.theme-select {
  height: 2.5rem;
  padding: 0 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--select-bg) !important;
  color: var(--select-text) !important;
  font-size: 0.9rem;
  cursor: pointer;
  box-sizing: border-box;
}



.row {
  display: flex;
  justify-content: center;
}



h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid var(--border-color);
  height: 3rem;
  padding: 0 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: var(--text-color);
  background-color: var(--input-bg);
  transition: border-color 0.25s, background-color 0.3s, color 0.3s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
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

/* Headers styling */
.headers-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: color-mix(in srgb, var(--bg-color) 95%, var(--text-color) 5%);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.headers-toggle {
  margin-bottom: 1rem;
}

.headers-toggle label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  cursor: pointer;
}

.headers-toggle input[type="checkbox"] {
  margin: 0;
  padding: 0;
  width: auto;
}

.custom-headers {
  margin-top: 1rem;
}

.header-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.header-key-input {
  flex: 1;
  min-width: 0;
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1em;
  font-family: inherit;
  box-sizing: border-box;
}

.header-value-input {
  flex: 2;
  min-width: 0;
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1em;
  font-family: inherit;
  box-sizing: border-box;
}

.remove-header-btn {
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  min-width: 3rem;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.remove-header-btn:hover:not(:disabled) {
  background: #cc3333;
}

.remove-header-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.5;
}

.add-header-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0 1.2rem;
  height: 3rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 0.5rem;
  font-size: 1em;
  box-sizing: border-box;
}

.add-header-btn:hover {
  background: #45a049;
}



/* Enhanced select styling for better theme support */
select {
  background-color: var(--select-bg) !important;
  color: var(--select-text) !important;
  border: 1px solid var(--border-color) !important;
}

select option {
  background-color: var(--select-bg) !important;
  color: var(--select-text) !important;
}

/* System theme dark mode selects */
@media (prefers-color-scheme: dark) {
  :root:not(.light-theme) select,
  :root:not(.light-theme) .method-select,
  :root:not(.light-theme) .user-agent-select,
  :root:not(.light-theme) .theme-select {
    background-color: var(--select-bg) !important;
    color: var(--select-text) !important;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23f6f6f6' d='M2 0L0 2h4zm0 5L0 3h4z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 0.75rem;
    padding-right: 2.5rem;
  }
}

/* Webkit browsers (Chrome, Safari, Edge) */
select::-webkit-scrollbar {
  width: 8px;
}

select::-webkit-scrollbar-track {
  background: var(--select-bg);
}

select::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

select::-webkit-scrollbar-thumb:hover {
  background: var(--text-color);
}

/* DNS Section Styling */
.dns-section {
  margin-top: 3rem;
  width: 100%;
  max-width: 800px;
}

.dns-section h2 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.dns-form {
  margin-bottom: 2rem;
}

.dns-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.dns-input {
  flex: 1;
  min-width: 300px;
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1em;
  font-family: inherit;
  box-sizing: border-box;
}

.dns-button {
  height: 3rem;
  padding: 0 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--button-bg);
  color: var(--text-color);
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.25s, background-color 0.3s, color 0.3s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.dns-button:hover {
  border-color: #396cd8;
}

.dns-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dns-results {
  width: 100%;
}

.dns-results h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.dns-records {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dns-record {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.dns-record-type {
  background-color: #4CAF50;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.dns-record-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dns-hostname {
  font-weight: 600;
  color: var(--text-color);
  font-size: 1.1em;
}

.dns-ips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dns-ip {
  background-color: color-mix(in srgb, var(--bg-color) 90%, var(--text-color) 10%);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
  border: 1px solid var(--border-color);
}

.dns-ttl {
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--text-color) 70%, transparent 30%);
  font-style: italic;
}

@media (max-width: 768px) {
  .dns-input-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .dns-input {
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .dns-record {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .dns-record-details {
    width: 100%;
  }
}

/* URL Cleaner Section Styling */
.url-cleaner-section {
  margin-top: 3rem;
  width: 100%;
  max-width: 800px;
}

.url-cleaner-section h2 {
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.url-cleaner-description {
  margin-bottom: 1.5rem;
  color: color-mix(in srgb, var(--text-color) 70%, transparent 30%);
  font-size: 0.9rem;
}

.url-cleaner-form {
  margin-bottom: 2rem;
}

.url-cleaner-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.url-cleaner-input {
  flex: 1;
  min-width: 350px;
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1em;
  font-family: inherit;
  box-sizing: border-box;
}

.url-cleaner-button {
  height: 3rem;
  padding: 0 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: #2196F3;
  color: white;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.url-cleaner-button:hover {
  background-color: #1976D2;
}

.url-cleaner-results {
  width: 100%;
}

.url-cleaner-results h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.cleaned-url-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.cleaned-url-display {
  flex: 1;
  min-width: 300px;
  padding: 1rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  word-break: break-all;
}

.cleaned-url-text {
  font-family: monospace;
  font-size: 0.9em;
  color: var(--text-color);
}

.error-message {
  color: #f44336;
  font-weight: 500;
}

.copy-url-button {
  height: 3rem;
  padding: 0 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: #4CAF50;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.copy-url-button:hover {
  background-color: #45a049;
}

.url-comparison {
  padding: 0.75rem;
  background-color: color-mix(in srgb, var(--bg-color) 95%, var(--text-color) 5%);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.url-diff {
  color: var(--text-color);
  font-size: 0.9rem;
}

.removed-params {
  color: #4CAF50;
  font-weight: 500;
}

.no-changes {
  color: #2196F3;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .url-cleaner-input-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .url-cleaner-input {
    width: 100%;
    min-width: unset;
    margin-bottom: 0.5rem;
  }
  
  .cleaned-url-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .cleaned-url-display {
    min-width: unset;
  }
}

/* WHOIS Section Styling */
.whois-section {
  margin-top: 3rem;
  width: 100%;
  max-width: 800px;
}

.whois-section h2 {
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.whois-description {
  margin-bottom: 1.5rem;
  color: color-mix(in srgb, var(--text-color) 70%, transparent 30%);
  font-size: 0.9rem;
}

.whois-form {
  margin-bottom: 2rem;
}

.whois-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.whois-input {
  flex: 1;
  min-width: 250px;
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1em;
  font-family: inherit;
  box-sizing: border-box;
}

.whois-button {
  height: 3rem;
  padding: 0 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: #9C27B0;
  color: white;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.whois-button:hover:not(:disabled) {
  background-color: #7B1FA2;
}

.whois-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.whois-results {
  width: 100%;
}

.whois-results h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.whois-display {
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.whois-text {
  margin: 0;
  font-family: monospace;
  font-size: 0.85em;
  color: var(--text-color);
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.4;
}

/* Geolocation Section Styling */
.geo-section {
  margin-top: 3rem;
  width: 100%;
  max-width: 800px;
}

.geo-section h2 {
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.geo-description {
  margin-bottom: 1.5rem;
  color: color-mix(in srgb, var(--text-color) 70%, transparent 30%);
  font-size: 0.9rem;
}

.geo-form {
  margin-bottom: 2rem;
}

.geo-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.geo-input {
  flex: 1;
  min-width: 200px;
  height: 3rem;
  padding: 0 1.2em;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1em;
  font-family: inherit;
  box-sizing: border-box;
}

.geo-button {
  height: 3rem;
  padding: 0 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: #FF9800;
  color: white;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.geo-button:hover:not(:disabled) {
  background-color: #F57C00;
}

.geo-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.geo-results {
  width: 100%;
}

.geo-results h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.geo-info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.geo-info-card {
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.geo-info-label {
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--text-color) 70%, transparent 30%);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.geo-info-value {
  font-size: 1.1rem;
  color: var(--text-color);
  font-weight: 600;
  word-break: break-word;
}

@media (max-width: 768px) {
  .whois-input-row,
  .geo-input-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .whois-input,
  .geo-input {
    width: 100%;
    min-width: unset;
    margin-bottom: 0.5rem;
  }
  
  .geo-info-cards {
    grid-template-columns: 1fr;
  }
}

</style>