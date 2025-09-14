use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::ToSocketAddrs;

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
        .invoke_handler(tauri::generate_handler![greet, make_http_request, resolve_dns])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
