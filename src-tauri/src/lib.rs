use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::ToSocketAddrs;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize)]
struct HttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

#[derive(Serialize, Deserialize)]
struct RequestHeaders {
    headers: HashMap<String, String>,
}

#[derive(Serialize, Deserialize)]
struct DnsResolution {
    hostname: String,
    ip_addresses: Vec<String>,
    record_type: String,
    ttl: Option<u32>,
}

#[derive(Serialize, Deserialize)]
struct GeolocationResult {
    ip: String,
    country: Option<String>,
    city: Option<String>,
    region: Option<String>,
    org: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct RadioStreamInfo {
    title: Option<String>,
    name: Option<String>,
    description: Option<String>,
    genre: Option<String>,
    bitrate: Option<String>,
    sample_rate: Option<String>,
    content_type: String,
    url: String,
}

#[derive(Clone)]
struct RadioStreamState {
    is_streaming: bool,
    current_url: Option<String>,
    stream_info: Option<RadioStreamInfo>,
}

// Global state for radio streaming
static RADIO_STATE: once_cell::sync::Lazy<Arc<Mutex<RadioStreamState>>> = 
    once_cell::sync::Lazy::new(|| {
        Arc::new(Mutex::new(RadioStreamState {
            is_streaming: false,
            current_url: None,
            stream_info: None,
        }))
    });

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn resolve_dns(hostname: String) -> Result<Vec<DnsResolution>, String> {
    let hostname_with_port = format!("{}:80", hostname);
    
    let socket_addrs = tokio::task::spawn_blocking(move || {
        hostname_with_port.to_socket_addrs()
    }).await.map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| format!("DNS resolution failed: {}", e))?;

    let mut ipv4_addresses = Vec::new();
    let mut ipv6_addresses = Vec::new();
    
    for addr in socket_addrs {
        match addr.ip() {
            std::net::IpAddr::V4(ipv4) => {
                ipv4_addresses.push(ipv4.to_string());
            }
            std::net::IpAddr::V6(ipv6) => {
                ipv6_addresses.push(ipv6.to_string());
            }
        }
    }

    let mut results = Vec::new();
    
    if !ipv4_addresses.is_empty() {
        results.push(DnsResolution {
            hostname: hostname.clone(),
            ip_addresses: ipv4_addresses,
            record_type: "A".to_string(),
            ttl: None, // std::net doesn't provide TTL info
        });
    }
    
    if !ipv6_addresses.is_empty() {
        results.push(DnsResolution {
            hostname: hostname.clone(),
            ip_addresses: ipv6_addresses,
            record_type: "AAAA".to_string(),
            ttl: None,
        });
    }

    if results.is_empty() {
        return Err(format!("No DNS records found for hostname: {}", hostname));
    }

    Ok(results)
}

#[tauri::command]
async fn whois_lookup(domain: String) -> Result<String, String> {
    // For now, return a mock response since external WHOIS tools may not be available
    // In a real implementation, you would use a WHOIS client or call external tools
    let mock_whois = format!(
        "Domain Name: {}\n\nThis is a mock WHOIS response.\n\nIn a real implementation, this would contain:\n- Registrar information\n- Registration dates\n- Name servers\n- Registrant contact info\n- Administrative contact\n- Technical contact\n\nNote: This is a demonstration. Real WHOIS data would require\nintegration with WHOIS servers or external APIs.",
        domain.to_uppercase()
    );
    
    // Simulate some processing time
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    Ok(mock_whois)
}

#[tauri::command]
async fn start_radio_stream(app: AppHandle, url: String) -> Result<RadioStreamInfo, String> {
    println!("Starting radio stream: {}", url);
    
    let mut state = RADIO_STATE.lock().await;
    
    // Stop previous stream if running
    if state.is_streaming {
        state.is_streaming = false;
        state.current_url = None;
        state.stream_info = None;
        println!("Stopped previous radio stream");
        
        // Emit stop event
        if let Err(e) = app.emit("radio-stream-stopped", ()) {
            println!("Failed to emit radio-stream-stopped: {}", e);
        }
        
        // Small delay to ensure cleanup
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    
    // Validate URL
    let parsed_url = url::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    
    println!("Parsed URL: {} (scheme: {})", parsed_url, parsed_url.scheme());
    
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // First, try to get stream info with HEAD request
    match client.head(&url).send().await {
        Ok(response) => {
            println!("HEAD request successful, status: {}", response.status());
            
            let headers = response.headers();
            let content_type = headers.get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("audio/mpeg")
                .to_string();
            
            let bitrate = headers.get("icy-br")
                .and_then(|v| v.to_str().ok())
                .map(|s| format!("{} kbps", s));
            
            let name = headers.get("icy-name")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            
            let genre = headers.get("icy-genre")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            
            let description = headers.get("icy-description")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            
            println!("Stream headers - Content-Type: {}, Bitrate: {:?}, Name: {:?}", content_type, bitrate, name);
            
            let stream_info = RadioStreamInfo {
                title: None,
                name,
                description,
                genre,
                bitrate,
                sample_rate: None,
                content_type: content_type.clone(),
                url: url.clone(),
            };
            
            // Update state
            state.is_streaming = true;
            state.current_url = Some(url.clone());
            state.stream_info = Some(stream_info.clone());
            
            println!("Radio stream started successfully");
            
            // Emit start event with stream info
            if let Err(e) = app.emit("radio-stream-started", &stream_info) {
                println!("Failed to emit radio-stream-started: {}", e);
            }
            
            return Ok(stream_info);
        }
        Err(e) => {
            println!("HEAD request failed: {}, trying direct stream", e);
        }
    }
    
    // If HEAD fails, try GET with limited read to get basic info
    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                println!("GET request successful, status: {}", response.status());
                
                let headers = response.headers();
                let content_type = headers.get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("audio/mpeg")
                    .to_string();
                
                println!("Direct stream available, content-type: {}", content_type);
                
                let stream_info = RadioStreamInfo {
                    title: None,
                    name: Some("Live Stream".to_string()),
                    description: None,
                    genre: None,
                    bitrate: None,
                    sample_rate: None,
                    content_type,
                    url: url.clone(),
                };
                
                // Update state
                state.is_streaming = true;
                state.current_url = Some(url.clone());
                state.stream_info = Some(stream_info.clone());
                
                println!("Radio stream started successfully (direct)");
                
                // Emit start event
                if let Err(e) = app.emit("radio-stream-started", &stream_info) {
                    println!("Failed to emit radio-stream-started: {}", e);
                }
                
                return Ok(stream_info);
            } else {
                return Err(format!("HTTP error: {}", response.status()));
            }
        }
        Err(e) => {
            return Err(format!("Failed to connect to stream: {}", e));
        }
    }
}

#[tauri::command]
async fn stop_radio_stream(app: AppHandle) -> Result<(), String> {
    println!("Stopping radio stream");
    
    let mut state = RADIO_STATE.lock().await;
    
    if state.is_streaming {
        state.is_streaming = false;
        state.current_url = None;
        state.stream_info = None;
        
        println!("Radio stream stopped");
        
        // Emit stop event
        if let Err(e) = app.emit("radio-stream-stopped", ()) {
            println!("Failed to emit radio-stream-stopped: {}", e);
        }
    } else {
        println!("No active radio stream to stop");
    }
    
    Ok(())
}

#[tauri::command]
async fn get_radio_stream_status() -> Result<Option<RadioStreamInfo>, String> {
    let state = RADIO_STATE.lock().await;
    Ok(state.stream_info.clone())
}

#[tauri::command]
async fn get_stream_proxy_url(url: String) -> Result<String, String> {
    // Return the original URL but indicate it should be played through the audio element
    // The browser will handle CORS through Tauri's webview context
    println!("Providing proxy URL for: {}", url);
    
    // Validate URL first
    url::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    
    // In Tauri, we can return the original URL as the webview context handles CORS differently
    // than regular browsers
    Ok(url)
}

#[tauri::command]
async fn geoip_lookup(ip: String) -> Result<GeolocationResult, String> {
    // Validate IP format (basic validation)
    if !ip.chars().all(|c| c.is_numeric() || c == '.') {
        return Err("Invalid IP address format".to_string());
    }
    
    // For demonstration, return mock data based on common public IPs
    // In a real implementation, you would use a GeoIP service/database
    let result = match ip.as_str() {
        "8.8.8.8" => GeolocationResult {
            ip: ip.clone(),
            country: Some("United States".to_string()),
            city: Some("Mountain View".to_string()),
            region: Some("California".to_string()),
            org: Some("Google LLC".to_string()),
        },
        "1.1.1.1" => GeolocationResult {
            ip: ip.clone(),
            country: Some("United States".to_string()),
            city: Some("San Francisco".to_string()),
            region: Some("California".to_string()),
            org: Some("Cloudflare, Inc.".to_string()),
        },
        _ => GeolocationResult {
            ip: ip.clone(),
            country: Some("Unknown".to_string()),
            city: Some("This is a mock geolocation service".to_string()),
            region: Some("Real implementation would use GeoIP database".to_string()),
            org: Some("Demo Organization".to_string()),
        },
    };
    
    // Simulate some processing time
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    Ok(result)
}

#[tauri::command]
async fn make_http_request(
    url: String, 
    method: String, 
    user_agent: Option<String>,
    custom_headers: Option<HashMap<String, String>>
) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();
    
    // Build request with optional User-Agent
    let mut request_builder = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "HEAD" => client.head(&url),
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };
    
    // Add User-Agent header if provided
    if let Some(ua) = user_agent {
        if !ua.trim().is_empty() {
            request_builder = request_builder.header("User-Agent", ua);
        }
    }
    
    // Add custom headers if provided
    if let Some(headers) = custom_headers {
        for (key, value) in headers {
            if !key.trim().is_empty() && !value.trim().is_empty() {
                request_builder = request_builder.header(key, value);
            }
        }
    }
    
    let response = request_builder.send().await;

    match response {
        Ok(resp) => {
            let status = resp.status().as_u16();
            
            // Convert headers to HashMap<String, String>
            let mut headers = std::collections::HashMap::new();
            for (key, value) in resp.headers().iter() {
                if let Ok(value_str) = value.to_str() {
                    headers.insert(key.to_string(), value_str.to_string());
                }
            }

            let body = resp.text().await.map_err(|e| e.to_string())?;
            
            Ok(HttpResponse {
                status,
                headers,
                body,
            })
        }
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            make_http_request, 
            resolve_dns, 
            whois_lookup, 
            geoip_lookup,
            start_radio_stream,
            stop_radio_stream, 
            get_radio_stream_status,
            get_stream_proxy_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
