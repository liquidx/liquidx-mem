# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Browser Extension (Manifest V3) built with React, TypeScript, and Vite. The extension allows users to save URLs with descriptions to a personal memory service at `mem.liquidx.net`.

## Development Commands

### Setup
```bash
pnpm install
```

### Development
```bash
pnpm dev          # Start development server with hot reload
pnpm type-check   # Run TypeScript type checking
```

### Building
```bash
pnpm build        # Build for production (tsc + vite build)
pnpm preview      # Preview built extension
```

### Loading Extension in Chrome
1. **Important**: Run `pnpm build` (not `pnpm dev`) to create the production `dist/` directory
2. Open `chrome://extensions/` and enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

**Note**: The development mode (`pnpm dev`) creates builds that cause CORS errors when loaded as unpacked extensions. Always use the production build.

## Architecture

### Core Stack
- **React 18** with TypeScript for UI components
- **Vite** with `@crxjs/vite-plugin` for Chrome extension development
- **Tailwind CSS** for styling
- **Chrome Manifest V3** with permissions for `activeTab`, `storage`, and `https://mem.liquidx.net/*`

### Key Files
- `src/App.tsx` - Main React component handling UI state and form logic
- `src/utils.ts` - Chrome API utilities (tabs, storage) and HTTP client
- `src/manifest.json` - Chrome extension manifest configuration
- `src/popup.html` - Extension popup entry point

### Extension Architecture
The extension operates as a popup-based Chrome extension that:
1. Auto-captures the current tab URL using Chrome's `tabs` API
2. Stores user's shared secret securely via Chrome's `storage.sync` API
3. Sends POST requests to `https://mem.liquidx.net/api/add` with URL and description
4. Provides settings UI to configure the shared secret

### State Management
Uses React hooks (`useState`, `useEffect`) for local state. No external state management library. Chrome storage API handles persistent data.

### API Integration
Communicates with external service via POST to `https://mem.liquidx.net/api/add`:
```json
{
  "text": "https://example.com Your description with #hashtags",
  "secret": "user-shared-secret"
}
```

## Testing and Quality

The project currently has no testing framework, linting, or formatting tools configured. When adding tests, consider Vitest since the project already uses Vite.