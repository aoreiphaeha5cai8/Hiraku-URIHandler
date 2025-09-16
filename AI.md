# AI Instructions

Hello AI! 👋

Please, do not modify this file!

## Rules

- Regarding Ubuntu, we only support the latest LTS version. But in general, we make cross-platform software.

- Autoplay Policy: В браузерной автоматизации всегда блокируется, но будет работать при реальном - пользовательском взаимодействии. Тем не мене для пользователя нужды в автовоспроизведении нет, - проигрывание запускается ручным взаимодействием.
- CORS: Зависит от настроек серверов радиостанций (некоторые поддерживают, некоторые нет)
- Отвечай на русском языке в диалогах чатов.
- Пожалуйста, указывай в отчётах, если после добавленных изменений необходимо выполнить установку - дополнительных пакетов, очистить кэш и т.п.

- Используй преимущественно TypeScript вместо JS.

## Project Components

### Audio System
- **Radio Player**: 15+ predefined stations with fallback URLs
- **Dynamic Compressor**: Web Audio API with configurable presets (None/Low/Medium/High)
- **Butterchurn Integration**: Live audio visualization inspired by breakcorn.ru
- **Audio Chain**: MediaElementSource → DynamicsCompressor → AnalyserNode → Destination
- **Themes**: 6 themes including full-screen Butterchurn visualization

### Technical Solutions
- **CSS-based Tab Switching**: Solves Svelte 5 conditional rendering issues
- **Global Audio Pipeline**: `window.initializeAudioPipeline()` and `window.connectButterchurnAudio()`
- **Keyboard Controls**: Space/Arrow keys for preset switching in Butterchurn theme
- **Fallback Systems**: WebGL → CSS animations, primary → fallback radio URLs

### Testing Coverage
- **77.5% success rate** (69/89 tests passing)
- **Audio chain and compressor**: 98% success
- **Full integration**: 100% success
- **UI components**: 0% (Svelte 5 SSR limitation in test environment)

### Architecture Files
- `AUDIO_ARCHITECTURE.md`: Detailed audio system documentation
- `SVELTE5_TAB_BUG.md`: Tab switching solution documentation
- `TEST_RESULTS.md`: Comprehensive test coverage report

## Style

- Prefer async/await over Promises.
- Use two spaces for indentation.
- Use one space to indent code before an inline comment.