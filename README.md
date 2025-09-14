# HTTP Client - Tauri App

A modern HTTP client built with Tauri, SvelteKit, and Rust. Features a clean interface for making HTTP requests with advanced User-Agent configuration.

![HTTP Client Screenshot](https://via.placeholder.com/800x400/2a2a2a/ffffff?text=HTTP+Client+Interface)

## ✨ Features

### 🌐 HTTP Methods Support
- **GET, POST, PUT, DELETE, PATCH, HEAD** - Full HTTP method coverage
- Clean, intuitive method selector
- Real-time request/response handling

### 🔧 Advanced User-Agent Configuration
- **Popular Browsers**: Chrome, Firefox, Safari, Edge (Windows/macOS/iOS)
- **Command Line Tools**: curl, wget
- **Search Engine Bots**: Googlebot, Bingbot, YandexBot
- **Social Media Bots**: Facebook, Twitter, LinkedIn
- **Custom User-Agent**: Write your own with live preview

### 📊 Response Display
- **Status Code** with color-coded indicators (success/error)
- **Response Headers** in expandable view
- **Response Body** with syntax highlighting
- **Request History** and error handling

### 🎨 Modern UI/UX
- **Dark/Light Theme** support
- **Responsive Design** for desktop and mobile
- **Real-time Validation** for URLs and inputs
- **Loading States** with progress indicators

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **pnpm**
- **Rust** and **Cargo**
- **System Dependencies** (Linux):
  ```bash
  # Ubuntu/Debian
  sudo apt install pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev \
    libappindicator3-dev librsvg2-dev
  
  # Fedora
  sudo dnf install pkg-config gtk3-devel webkit2gtk4.1-devel \
    libappindicator-gtk3-devel librsvg2-devel
  ```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tauri-http-client

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

### Frontend-Only Development

```bash
# Run just the web interface (for UI development)
pnpm dev

# Build web assets
pnpm build
```

## 🏗️ Architecture

### Frontend (SvelteKit + TypeScript)
- **Framework**: SvelteKit with TypeScript
- **Build Tool**: Vite
- **Styling**: Vanilla CSS with CSS custom properties
- **State Management**: Svelte 5 runes (`$state`, `$derived`)

### Backend (Rust + Tauri)
- **HTTP Client**: reqwest with async/await
- **Runtime**: Tokio for async operations
- **Serialization**: serde for JSON handling
- **Desktop Integration**: Tauri 2.0

### Key Components

```
src/
├── routes/
│   ├── +page.svelte      # Main HTTP client interface
│   └── +layout.ts        # SPA configuration
├── app.html              # HTML template
└── ...

src-tauri/
├── src/
│   ├── main.rs           # Application entry point
│   └── lib.rs            # HTTP client logic
├── Cargo.toml            # Rust dependencies
└── tauri.conf.json       # Tauri configuration
```

## 🔌 API Reference

### Rust Commands

#### `make_http_request`
Executes HTTP requests with optional User-Agent.

```rust
#[tauri::command]
async fn make_http_request(
    url: String, 
    method: String, 
    user_agent: Option<String>
) -> Result<HttpResponse, String>
```

**Parameters:**
- `url`: Target URL (required)
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD)
- `user_agent`: Optional User-Agent header

**Response:**
```rust
struct HttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}
```

### Frontend API

#### User-Agent Presets
```javascript
const userAgents = {
  "chrome-windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  "curl": "curl/8.4.0",
  "googlebot": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  // ... more presets
}
```

## 🎯 Usage Examples

### Basic GET Request
1. Enter URL: `https://api.github.com/users/octocat`
2. Select method: `GET`
3. Choose User-Agent: `Chrome (Windows)`
4. Click "Send Request"

### API Testing with Custom User-Agent
1. Select method: `POST`
2. Enter API endpoint
3. Choose User-Agent: `Custom`
4. Enter: `MyApp/1.0 (API Testing)`
5. Send request

### Bot Simulation
1. Select User-Agent: `Googlebot`
2. Test how your website responds to search crawlers
3. Compare responses with different bot User-Agents

## 🛠️ Development

### Project Structure
- **Tauri App**: Native desktop application
- **SvelteKit Frontend**: Modern web interface
- **Rust Backend**: High-performance HTTP client

### Adding New User-Agents
Edit `src/routes/+page.svelte`:

```javascript
const userAgents = {
  // ... existing agents
  "my-new-agent": { 
    name: "My New Agent", 
    value: "MyAgent/1.0" 
  }
};
```

### Extending HTTP Methods
Update both frontend and backend:

1. **Frontend** (`+page.svelte`):
```javascript
const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
```

2. **Backend** (`lib.rs`):
```rust
match method.to_uppercase().as_str() {
    "OPTIONS" => client.request(Method::OPTIONS, &url),
    // ... other methods
}
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🔧 Troubleshooting

### Common Issues

**Build fails on Linux:**
```bash
# Install system dependencies
sudo apt install pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
```

**Tauri commands not working:**
- Ensure you're running `pnpm tauri dev`, not just `pnpm dev`
- Check that the Rust backend compiled successfully

**CORS errors in browser:**
- This is expected when running frontend-only mode
- Use `pnpm tauri dev` for full functionality

---

**Built with ❤️ using Tauri, SvelteKit, and Rust**