<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  // DNS Resolution
  let dnsHostname = $state("");
  let dnsResult = $state<Array<{hostname: string, ip_addresses: string[], record_type: string, ttl?: number}>>([]);
  let isDnsLoading = $state(false);

  // URL Cleaner
  let urlToClean = $state("");
  let cleanedUrl = $state("");

  // WHOIS Lookup
  let whoisDomain = $state("");
  let whoisResult = $state("");
  let isWhoisLoading = $state(false);

  // IP Geolocation
  let geoIp = $state("");
  let geoResult = $state<{ip: string, country?: string, city?: string, region?: string, org?: string} | null>(null);
  let isGeoLoading = $state(false);

  async function resolveDns() {
    if (!dnsHostname.trim()) {
      alert("Please enter a hostname");
      return;
    }

    isDnsLoading = true;
    dnsResult = [];

    try {
      const result = await invoke<Array<{hostname: string, ip_addresses: string[], record_type: string, ttl?: number}>>(
        "resolve_dns",
        { hostname: dnsHostname.trim() }
      );
      dnsResult = result;
    } catch (error) {
      alert(`DNS Resolution Error: ${error}`);
    } finally {
      isDnsLoading = false;
    }
  }

  function cleanUrl() {
    if (!urlToClean.trim()) {
      alert("Please enter a URL to clean");
      return;
    }

    try {
      const url = new URL(urlToClean.trim());
      // Remove common tracking parameters
      const paramsToRemove = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'campaign_id',
        '_ga', '_gid', '__cid', 'mc_cid', 'mc_eid'
      ];
      
      paramsToRemove.forEach(param => {
        url.searchParams.delete(param);
      });
      
      cleanedUrl = url.toString();
    } catch (error) {
      alert("Invalid URL format");
    }
  }

  async function lookupWhois() {
    if (!whoisDomain.trim()) {
      alert("Please enter a domain");
      return;
    }

    isWhoisLoading = true;
    whoisResult = "";

    try {
      const result = await invoke<string>("whois_lookup", { domain: whoisDomain.trim() });
      whoisResult = result;
    } catch (error) {
      whoisResult = `WHOIS Lookup Error: ${error}`;
    } finally {
      isWhoisLoading = false;
    }
  }

  async function lookupGeoIp() {
    if (!geoIp.trim()) {
      alert("Please enter an IP address");
      return;
    }

    isGeoLoading = true;
    geoResult = null;

    try {
      const result = await invoke<{ip: string, country?: string, city?: string, region?: string, org?: string}>(
        "geoip_lookup",
        { ip: geoIp.trim() }
      );
      geoResult = result;
    } catch (error) {
      alert(`GeoIP Lookup Error: ${error}`);
    } finally {
      isGeoLoading = false;
    }
  }
</script>

<div class="network-tools">
  <div class="tools-grid">
    <!-- DNS Resolution -->
    <div class="tool-card">
      <h2>🔍 DNS Resolution</h2>
      <p class="tool-description">Resolve domain names to IP addresses</p>
      
      <div class="input-group">
        <input 
          type="text" 
          bind:value={dnsHostname} 
          placeholder="Enter hostname (e.g., google.com)" 
          class="tool-input"
          onkeydown={(e) => e.key === 'Enter' && resolveDns()}
        />
        <button 
          onclick={resolveDns} 
          disabled={isDnsLoading || !dnsHostname.trim()} 
          class="tool-button"
        >
          {isDnsLoading ? "Resolving..." : "Resolve"}
        </button>
      </div>

      {#if isDnsLoading}
        <div class="loading-indicator">
          <div class="spinner"></div>
          <span>Resolving {dnsHostname}...</span>
        </div>
      {/if}

      {#if dnsResult.length > 0}
        <div class="results-section">
          <h3>DNS Records:</h3>
          {#each dnsResult as record}
            <div class="dns-record">
              <div class="record-header">
                <span class="record-type">{record.record_type}</span>
                <span class="record-hostname">{record.hostname}</span>
              </div>
              <div class="ip-addresses">
                {#each record.ip_addresses as ip}
                  <span class="ip-address">{ip}</span>
                {/each}
              </div>
              {#if record.ttl}
                <div class="ttl-info">TTL: {record.ttl}s</div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- URL Cleaner -->
    <div class="tool-card">
      <h2>🧹 URL Cleaner</h2>
      <p class="tool-description">Remove tracking parameters from URLs</p>
      
      <div class="input-group">
        <input 
          type="url" 
          bind:value={urlToClean} 
          placeholder="Enter URL to clean" 
          class="tool-input"
          onkeydown={(e) => e.key === 'Enter' && cleanUrl()}
        />
        <button 
          onclick={cleanUrl} 
          disabled={!urlToClean.trim()} 
          class="tool-button"
        >
          Clean
        </button>
      </div>

      {#if cleanedUrl}
        <div class="results-section">
          <h3>Cleaned URL:</h3>
          <div class="url-result">
            <pre class="cleaned-url">{cleanedUrl}</pre>
            <button 
              onclick={() => navigator.clipboard.writeText(cleanedUrl)} 
              class="copy-button"
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- WHOIS Lookup -->
    <div class="tool-card">
      <h2>📄 WHOIS Lookup</h2>
      <p class="tool-description">Get domain registration information</p>
      
      <div class="input-group">
        <input 
          type="text" 
          bind:value={whoisDomain} 
          placeholder="Enter domain (e.g., example.com)" 
          class="tool-input"
          onkeydown={(e) => e.key === 'Enter' && lookupWhois()}
        />
        <button 
          onclick={lookupWhois} 
          disabled={isWhoisLoading || !whoisDomain.trim()} 
          class="tool-button"
        >
          {isWhoisLoading ? "Looking up..." : "Lookup"}
        </button>
      </div>

      {#if isWhoisLoading}
        <div class="loading-indicator">
          <div class="spinner"></div>
          <span>Looking up WHOIS information for {whoisDomain}...</span>
        </div>
      {/if}

      {#if whoisResult}
        <div class="results-section">
          <h3>WHOIS Information:</h3>
          <pre class="whois-result">{whoisResult}</pre>
        </div>
      {/if}
    </div>

    <!-- IP Geolocation -->
    <div class="tool-card">
      <h2>🌍 IP Geolocation</h2>
      <p class="tool-description">Find location information for IP addresses</p>
      
      <div class="input-group">
        <input 
          type="text" 
          bind:value={geoIp} 
          placeholder="Enter IP address (e.g., 8.8.8.8)" 
          class="tool-input"
          onkeydown={(e) => e.key === 'Enter' && lookupGeoIp()}
        />
        <button 
          onclick={lookupGeoIp} 
          disabled={isGeoLoading || !geoIp.trim()} 
          class="tool-button"
        >
          {isGeoLoading ? "Locating..." : "Locate"}
        </button>
      </div>

      <div class="quick-ips">
        <span>Quick test:</span>
        <button onclick={() => { geoIp = '8.8.8.8'; lookupGeoIp(); }} class="quick-ip-button">8.8.8.8</button>
        <button onclick={() => { geoIp = '1.1.1.1'; lookupGeoIp(); }} class="quick-ip-button">1.1.1.1</button>
      </div>

      {#if isGeoLoading}
        <div class="loading-indicator">
          <div class="spinner"></div>
          <span>Locating IP {geoIp}...</span>
        </div>
      {/if}

      {#if geoResult}
        <div class="results-section">
          <h3>Geolocation Information:</h3>
          <div class="geo-info">
            <div class="info-card">
              <div class="info-label">IP Address</div>
              <div class="info-value">{geoResult.ip}</div>
            </div>
            {#if geoResult.country}
              <div class="info-card">
                <div class="info-label">Country</div>
                <div class="info-value">{geoResult.country}</div>
              </div>
            {/if}
            {#if geoResult.region}
              <div class="info-card">
                <div class="info-label">Region</div>
                <div class="info-value">{geoResult.region}</div>
              </div>
            {/if}
            {#if geoResult.city}
              <div class="info-card">
                <div class="info-label">City</div>
                <div class="info-value">{geoResult.city}</div>
              </div>
            {/if}
            {#if geoResult.org}
              <div class="info-card">
                <div class="info-label">Organization</div>
                <div class="info-value">{geoResult.org}</div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .network-tools {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .tool-card {
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 12px;
    padding: 1.5rem;
    transition: box-shadow 0.25s;
  }

  .tool-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .tool-card h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color, #333333);
    font-size: 1.25rem;
  }

  .tool-description {
    color: var(--text-secondary, #666666);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .input-group {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .tool-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #333333);
  }

  .tool-button {
    padding: 0.75rem 1.5rem;
    background: var(--primary-color, #007acc);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.25s;
    white-space: nowrap;
  }

  .tool-button:hover:not(:disabled) {
    background: var(--primary-hover, #005fa3);
  }

  .tool-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .quick-ips {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .quick-ips span {
    font-size: 0.9rem;
    color: var(--text-secondary, #666666);
  }

  .quick-ip-button {
    padding: 0.25rem 0.5rem;
    background: var(--secondary-bg, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.25s;
  }

  .quick-ip-button:hover {
    background: var(--primary-color, #007acc);
    color: white;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--info-bg, #e3f2fd);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-top: 2px solid var(--primary-color, #007acc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .results-section {
    margin-top: 1rem;
  }

  .results-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-color, #333333);
    font-size: 1.1rem;
  }

  .dns-record {
    background: var(--secondary-bg, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .record-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .record-type {
    background: var(--primary-color, #007acc);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .record-hostname {
    font-weight: 500;
    color: var(--text-color, #333333);
  }

  .ip-addresses {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .ip-address {
    background: var(--success-bg, #d4edda);
    color: var(--success-color, #155724);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9rem;
  }

  .ttl-info {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #666666);
  }

  .url-result {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--secondary-bg, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
  }

  .cleaned-url {
    flex: 1;
    margin: 0;
    font-family: monospace;
    font-size: 0.9rem;
    word-break: break-all;
    background: transparent;
  }

  .copy-button {
    background: var(--success-color, #28a745);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: 0.8rem;
    white-space: nowrap;
    transition: background-color 0.25s;
  }

  .copy-button:hover {
    background: var(--success-hover, #218838);
  }

  .whois-result {
    background: var(--code-bg, #f8f9fa);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    font-family: monospace;
    font-size: 0.9rem;
    line-height: 1.4;
    white-space: pre-wrap;
    max-height: 300px;
    overflow-y: auto;
    margin: 0;
  }

  .geo-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .info-card {
    background: var(--secondary-bg, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
  }

  .info-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary, #666666);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .info-value {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-color, #333333);
    word-break: break-word;
  }

  @media (max-width: 768px) {
    .network-tools {
      padding: 1rem;
    }

    .tools-grid {
      grid-template-columns: 1fr;
    }

    .input-group {
      flex-direction: column;
    }

    .url-result {
      flex-direction: column;
      align-items: stretch;
    }

    .copy-button {
      align-self: flex-start;
    }

    .record-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .geo-info {
      grid-template-columns: 1fr;
    }
  }
</style>