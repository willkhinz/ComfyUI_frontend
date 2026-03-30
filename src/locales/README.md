# Internationalization (i18n)

Our project supports multiple languages using `vue-i18n`. This allows users around the world to use the application in their preferred language.

## Supported Languages

- ar (العربية)
- en (English)
- es (Español)
- fa (فارسی)
- fr (Français)
- ja (日本語)
- ko (한국어)
- pt-BR (Português Brasileiro)
- ru (Русский)
- tr (Türkçe)
- zh (中文)
- zh-TW (繁體中文)

## How to Add a New Language

Want to add a new language to ComfyUI? See our detailed [Contributing Guide](./CONTRIBUTING.md) with step-by-step instructions and confirmed working process.

### Quick Start

1. Open an issue or reach out on Discord to request a new language
2. Follow the [technical process](./CONTRIBUTING.md#technical-process-confirmed-working) or ask for help
3. Our CI will automatically generate translations using OpenAI
4. Become a maintainer for your language

### File Structure

Each language has 4 translation files in `src/locales/[language-code]/`:

- `main.json` - Main UI text
- `commands.json` - Command descriptions
- `settings.json` - Settings panel
- `nodeDefs.json` - Node definitions
