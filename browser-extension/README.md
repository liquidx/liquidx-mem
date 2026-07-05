# LiquidX Mem Extension

A Chrome extension to save URLs and descriptions to mem.liquidx.net.

## Features

- Capture current tab URL automatically
- Add descriptions with hashtag support
- Secure storage of shared secret
- Clean, responsive UI

## Development

### Setup

```bash
pnpm install
```

### Development Mode

```bash
pnpm dev
```

This starts Vite in development mode with hot-reload support.

### Build for Production

```bash
pnpm build
```

The extension will be built to the `dist/` directory.

### Loading in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" and select the `dist/` folder
4. The extension icon should appear in the toolbar

### Configuration

1. Click the extension icon
2. Click the settings gear icon
3. Enter your shared secret for mem.liquidx.net
4. Click "Save Secret"

### Usage

1. Navigate to any webpage
2. Click the extension icon
3. Add a description (hashtags supported)
4. Click "Save to Mem"

## API Format

The extension sends POST requests to `https://mem.liquidx.net/_api/mem/add` with:

```json
{
  "text": "https://example.com Your description with #hashtags",
  "secret": "your-shared-secret"
}
```

## File Structure

```
src/
├── manifest.json          # Chrome extension manifest
├── popup.html             # Extension popup HTML
├── popup.tsx              # React entry point
├── App.tsx                # Main React component
├── utils.ts               # Chrome API utilities
└── index.css              # Tailwind CSS styles
```
