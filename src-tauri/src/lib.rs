use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct HttpResponse {
    status: u16,
    headers: std::collections::HashMap<String, String>,
    body: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn make_http_request(url: String, method: String) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();
    
    let response = match method.to_uppercase().as_str() {
        "GET" => client.get(&url).send().await,
        "POST" => client.post(&url).send().await,
        "PUT" => client.put(&url).send().await,
        "DELETE" => client.delete(&url).send().await,
        "PATCH" => client.patch(&url).send().await,
        "HEAD" => client.head(&url).send().await,
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };

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
        .invoke_handler(tauri::generate_handler![greet, make_http_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
