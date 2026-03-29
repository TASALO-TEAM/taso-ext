# AGENTS.md — TASALO Extension Developer Guide

## Project Structure

```
taso-ext/
├── manifest.json       # Extension manifest (V3)
├── icons/             # Extension icons
├── src/
│   ├── background.js   # Service worker
│   ├── constants.js    # Shared constants
│   ├── popup.html      # Popup UI
│   ├── popup.css       # Popup styles (Liquid Glass)
│   ├── popup.js        # Popup logic
│   ├── newtab.html     # New tab page
│   ├── newtab.css      # New tab styles
│   ├── newtab.js       # New tab logic
│   ├── options.html    # Options page
│   ├── options.css     # Options styles
│   ├── options.js      # Options logic
│   └── content.js      # Content script (optional)
```

## Commands

```bash
# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select taso-ext/ directory

# Load in Firefox
# 1. Go to about:debugging#/runtime/this-firefox
# 2. Click "Load Temporary Add-on"
# 3. Select manifest.json
```

## Critical Patterns

### Cross-Browser Compatibility

```javascript
// Use chrome.* API (Firefox supports it via polyfill)
const browser = globalThis.browser || chrome;

// For Firefox-specific features
if (typeof browser !== 'undefined') {
  // Firefox API
} else {
  // Chrome API
}
```

### Service Worker Lifecycle

```javascript
// background.js
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize storage
  await setupAlarms();
  await fetchRates();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refresh-rates') {
    await fetchRates();
  }
});
```

### Storage Pattern

```javascript
// Read
const { rates } = await chrome.storage.local.get('rates');

// Write
await chrome.storage.local.set({ 
  rates: data, 
  lastUpdated: new Date().toISOString() 
});

// Listen for changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.rates) {
    renderRates(changes.rates.newValue);
  }
});
```

## API Integration

### taso-api Endpoints

```javascript
// Latest rates
GET http://localhost:8040/api/v1/tasas/latest

// Response format
{
  "ok": true,
  "data": {
    "eltoque": { /* rates */ },
    "cadeca": { /* rates */ },
    "bcc": { /* rates */ },
    "binance": { /* rates */ }
  },
  "updated_at": "2026-03-29T00:00:00Z"
}
```

## Design System

### Liquid Glass Variables

```css
:root {
  /* Dark theme */
  --bg: #09091e;
  --bg-glass: rgba(16, 16, 42, 0.92);
  --border: rgba(255, 255, 255, 0.1);
  --border-accent: rgba(91, 138, 255, 0.4);
  --text: #eeeef8;
  --accent: #5b8aff;
  --up: #ff6b6b;
  --down: #4ade80;
  --glass-blur: 20px;
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

## Testing

Manual testing checklist:
- [ ] Popup loads with rates
- [ ] New tab shows dashboard
- [ ] Options save correctly
- [ ] Omnibox suggests currencies
- [ ] Auto-refresh works (5 min)
- [ ] Theme toggle works
- [ ] Works in Chrome
- [ ] Works in Firefox

## Common Issues

### Service Worker Not Running
Check `chrome://extensions/` → Inspect service worker → Console

### CORS Errors
taso-api must have CORS enabled for extension origin

### Storage Quota
chrome.storage.local has 5MB quota — monitor usage

## Versioning

Follow semantic versioning:
- **0.1.0** → Initial release
- **0.1.1, 0.1.2** → Bug fixes
- **0.2.0, 0.3.0** → New features

Update version in:
1. `manifest.json` → `version` field
2. `README.md` → Version History section
3. Create git tag: `git tag v0.1.0`
