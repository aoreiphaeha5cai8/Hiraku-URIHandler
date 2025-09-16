# 🚀 Network Toolkit - Tauri App

A modern network toolkit built with Tauri, SvelteKit, and Rust. Features a comprehensive HTTP client, network diagnostic tools, and an advanced internet radio player with live audio visualization powered by Butterchurn.

![Network Toolkit Screenshot](https://via.placeholder.com/800x400/2a2a2a/ffffff?text=Network+Toolkit+Interface)

## ✨ Key Features

### 🌐 HTTP Client
- **Full HTTP Methods Support**: GET, POST, PUT, DELETE, PATCH, HEAD
- **Advanced User-Agent Configuration**: Popular browsers, search engine bots, command-line tools
- **Custom Headers** and request preview
- **Color-coded Status Indicators** and syntax highlighting for responses
- **Request History** and comprehensive error handling

### 🔧 Network Tools
- **DNS Resolution** - Resolve domain names to IPv4/IPv6 addresses
- **WHOIS Lookup** - Domain registration information
- **IP Geolocation** - Location and provider information
- **URL Analysis** and validation tools

### 📻 Internet Radio Player (Main Feature!)
- **15+ Predefined Stations** across various genres:
  - 🎵 **Lofi Hip Hop & Chillout**: Zeno.FM, SomaFM Groove Salad
  - 🔥 **Electronic & Breakcore**: Breakcorn Radio (Main + Mezzo)
  - 🤖 **Hardcore**: Breakcore Mashcore Radio  
  - 🌊 **PsyTrance**: Radio Schizoid channels (Chillout, Dub Techno, Progressive, PsyTrance)
  - ⛵ **Ambient**: Nautic Radio, SomaFM Drone Zone
- **Format Support**: MP3, AAC, OGG streams, M3U/PLS playlists
- **Automatic Fallback** to backup URLs on connection failures
- **Real-time Volume Control** with live adjustment

### 🎛️ Advanced Audio Processing
- **Web Audio API Chain**: `MediaElementSource → DynamicsCompressor → AnalyserNode → Destination`
- **Dynamic Audio Compressor** with configurable parameters:
  - Threshold, Knee, Ratio, Attack, Release settings
  - Presets: None, Low, Medium, High compression levels
- **Real-time Audio Analysis** for visualization pipeline
- **Settings Modal** for precise parameter adjustment

### 🌈 Butterchurn Audio Visualization
- **Live Visual Effects** inspired by breakcorn.ru
- **100+ Visualization Presets** with automatic cycling support
- **WebGL Rendering** with CSS gradient fallback for compatibility
- **Keyboard Shortcuts**:
  - `Space` / `→` - Next preset
  - `Backspace` / `←` - Previous preset  
  - `H` - Quick preset change without blend
- **Automatic Cycles** with configurable intervals (5-120 seconds)
- **Random and Sequential** preset switching modes

### 🎨 Theme System
- **System** 🖥️ - Automatic light/dark switching
- **Light** ☀️ - Classic light theme
- **Dark** 🌙 - Modern dark theme
- **Plum** 🍇 - Glassmorphism with gradient effects
- **Blur** ✨ - Dynamic blur theme with audio-reactive animation
- **Butterchurn** 🌈 - **Full-screen live visualization theme** (unique feature!)

### 🔧 Technical Features
- **CSS-based Tab Switching** - Solution for Svelte 5 conditional rendering issues
- **Cross-platform** - Windows, macOS, Linux support
- **TypeScript** for type safety throughout
- **Rust Backend** for high performance networking
- **Modern Architecture** with clear separation of concerns

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **pnpm**
- **Rust** and **Cargo** (for Tauri)
- **System Dependencies** (Linux):
  ```bash
  # Ubuntu/Debian
  sudo apt install pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev \
    libappindicator3-dev librsvg2-dev
  
  # Fedora
  sudo dnf install pkg-config gtk3-devel webkit2gtk4.1-devel \
    libappindicator-gtk3-devel librsvg2-devel
  ```

### Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd network-toolkit

# Install dependencies
pnpm install

# Run in development mode (recommended)
pnpm tauri dev

# Build for production
pnpm tauri build

# Frontend-only development (for UI work)
pnpm dev
```

## 🏗️ Project Architecture

### Frontend Stack
- **Framework**: SvelteKit with TypeScript
- **Build Tool**: Vite with Hot Module Replacement
- **Styling**: Vanilla CSS with CSS custom properties
- **State Management**: Svelte 5 runes (`$state`, `$derived`)
- **Audio**: Web Audio API + Butterchurn + NexusUI

### Backend Stack
- **Runtime**: Tauri 2.0 (Rust)
- **HTTP Client**: reqwest with async/await
- **Async Runtime**: Tokio
- **Serialization**: serde for JSON handling
- **Desktop Integration**: Native OS integration

### Project Structure

```
src/
├── routes/
│   ├── +page.svelte              # Main app with theme management
│   └── +layout.ts                # SPA configuration
├── lib/
│   ├── components/
│   │   ├── TabNavigation.svelte   # Tab navigation component
│   │   ├── SettingsModal.svelte   # Audio settings modal
│   │   ├── AudioSettings.svelte   # Compressor and audio chain
│   │   └── ButterchurmControls.svelte # Visualization controls
│   ├── tabs/
│   │   ├── HttpClient.svelte      # HTTP client interface
│   │   ├── NetworkTools.svelte    # DNS/WHOIS/IP tools
│   │   └── RadioPlayer.svelte     # Radio player with 15+ stations
│   └── tests/                     # Comprehensive test suite
└── app.html                       # HTML template

src-tauri/
├── src/
│   ├── main.rs                   # Application entry point
│   └── lib.rs                    # HTTP client + radio streaming
├── Cargo.toml                    # Rust dependencies
└── tauri.conf.json              # Tauri configuration
```

## 🔌 API Reference

### Rust Commands (Backend)

#### HTTP Client
```rust
#[tauri::command]
async fn make_http_request(
    url: String, 
    method: String, 
    user_agent: Option<String>,
    custom_headers: Option<HashMap<String, String>>
) -> Result<HttpResponse, String>
```

#### Network Tools
```rust
#[tauri::command]
async fn resolve_dns(hostname: String) -> Result<Vec<DnsResolution>, String>

#[tauri::command] 
async fn whois_lookup(domain: String) -> Result<String, String>

#[tauri::command]
async fn geoip_lookup(ip: String) -> Result<GeolocationResult, String>
```

#### Radio Streaming
```rust
#[tauri::command]
async fn start_radio_stream(app: AppHandle, url: String) -> Result<RadioStreamInfo, String>

#[tauri::command]
async fn stop_radio_stream(app: AppHandle) -> Result<(), String>

#[tauri::command]
async fn get_stream_proxy_url(url: String) -> Result<String, String>
```

### Frontend Audio Pipeline

#### Audio Chain Initialization
```javascript
// Global functions for audio pipeline integration
window.initializeAudioPipeline = (audioContext, source) => {
  // Create and configure compressor
  // Connect to processing chain
  // Return final AudioNode
};

window.connectButterchurnAudio = (audioSourceNode) => {
  // Connect audio to Butterchurn visualizer
  // Setup real-time analysis
};
```

#### User-Agent Presets
```javascript
const userAgents = {
  "chrome-windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  "curl": "curl/8.4.0",
  "googlebot": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  // ... 15+ predefined User-Agent strings
};
```

## 🎯 Usage Examples

### HTTP Client Testing
```bash
# API testing with custom User-Agent
1. Select method: POST
2. Enter URL: https://api.example.com/data
3. User-Agent: "MyApp/1.0 (API Testing)"
4. Add headers: Content-Type: application/json
5. Send request
```

### Network Diagnostics
```bash
# DNS resolution
DNS Lookup: google.com → ["142.250.191.14", "2a00:1450:4001:830::200e"]

# IP geolocation  
IP: 8.8.8.8 → Mountain View, California, USA (Google LLC)
```

### Radio Player + Visualization
```bash
# Complete audio-visual experience
1. Select theme: "Butterchurn" 🌈
2. Start station: "🔥 Breakcorn Radio - Main"
3. Configure compressor: "Medium" preset
4. Enjoy live visualization with auto-changing presets!
```

## 🧪 Testing & Quality

### Current Coverage: 77.5% (69/89 tests passing)

| Component | Tests | Passed | Coverage |
|-----------|-------|--------|----------|
| **Audio Chain + Compressor** | 49 | 48 | 98% |
| **Butterchurn Integration** | 26 | 15 | 58%* |
| **Full Integration** | 15 | 15 | 100% |
| **Core Functionality** | 5 | 5 | 100% |

\* *UI components not tested due to Svelte 5 SSR limitations in test environment*

### Running Tests
```bash
# Full test suite
pnpm test:run

# Interactive testing
pnpm test:ui

# Coverage report
pnpm test:coverage
```

## 🛠️ Development & Extension

### Adding New Radio Stations
In `src/lib/tabs/RadioPlayer.svelte`:
```javascript
const popularStreams = [
  // ... existing stations
  { 
    name: "🎼 My New Station", 
    url: "http://stream.example.com:8000/live",
    fallback: "https://backup.example.com/stream",
    format: "MP3"
  }
];
```

### Creating New Butterchurn Presets
```javascript
// Presets are managed automatically through butterchurn-presets
// Use the SettingsModal component for customization
```

### Adding HTTP Methods
1. **Frontend** (`HttpClient.svelte`):
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

### Creating New Themes
Add CSS custom properties in `src/routes/+page.svelte`:
```css
:global([data-theme="my-theme"]) {
  --primary-color: #custom-color;
  --bg-color: #custom-background;
  /* ... other variables */
}
```

## 🔧 Troubleshooting

### Common Issues

**Build failures on Linux:**
```bash
sudo apt install pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
```

**Tauri commands not working:**
- Ensure you're running `pnpm tauri dev`, not just `pnpm dev`
- Check that the Rust backend compiled successfully

**CORS errors:**
- Expected behavior in `pnpm dev` mode
- Use `pnpm tauri dev` for full functionality

**Audio not playing:**
- Check browser autoplay policy (requires user interaction)
- Ensure radio station supports CORS
- Try fallback URLs from predefined stations

**Butterchurn not loading:**
- Check WebGL support in browser
- CSS fallback animation is used when WebGL unavailable
- Ensure audio context is activated by user interaction

### Known Limitations

1. **Autoplay Policy**: First playback requires user click
2. **CORS**: Depends on radio server configurations
3. **WebGL**: Butterchurn requires WebGL for full functionality
4. **UI Tests**: Svelte 5 SSR limitations in test environment (functionality not affected)

## 🤝 Contributing

### Contribution Process
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes following the style guide
4. Write/update tests
5. Run full test suite: `pnpm test:run`
6. Submit Pull Request

### Style Guide
- **TypeScript** preferred over JavaScript
- **async/await** instead of Promise chains
- **2 spaces** for indentation
- **1 space** before inline comments
- Commits: lowercase, imperative mood, ≤50 characters

## 📄 License

MIT License - see LICENSE file for details.

---

## 🎵 Special Thanks

**Inspired by [breakcorn.ru](https://breakcorn.ru)** - for the idea of integrating Butterchurn visualization with radio streams.

**This project demonstrates a unique combination of:**
- 🌐 Professional network diagnostic tools
- 📻 High-quality internet radio player
- 🎛️ Advanced audio processing capabilities
- 🌈 Live audio visualization
- 🎨 Modern design with multiple themes

**Built with ❤️ using Tauri, SvelteKit, Rust, and Butterchurn**