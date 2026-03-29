# TASALO Extension — Testing Guide

> Guía completa de pruebas para TASALO Browser Extension v0.2.0

---

## 🎯 Quick Start

```bash
cd /home/ersus/tasalo/taso-ext/.worktrees/taso-ext-v1

# 1. Verify JS syntax
node --check src/background.js
node --check src/constants.js
node --check src/popup.js
node --check src/newtab.js
node --check src/options.js

# 2. Load in Chrome
# chrome://extensions/ → Load unpacked → Select this folder

# 3. Test immediately
# Extension should work without configuration
```

---

## ✅ Pre-Installation Checklist

### Files Verification

```bash
# Check all required files exist
ls -la manifest.json
ls -la src/background.js
ls -la src/constants.js
ls -la src/popup.html src/popup.css src/popup.js
ls -la src/newtab.html src/newtab.css src/newtab.js
ls -la src/options.html src/options.css src/options.js
ls -la icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
```

**Expected:** All files present, icons >1KB each

### Manifest Validation

```bash
# Validate manifest.json
node -e "
const m = require('./manifest.json');
console.log('Name:', m.name);
console.log('Version:', m.version);
console.log('Manifest V:', m.manifest_version);
console.log('Permissions:', m.permissions.join(', '));
console.log('✅ Valid manifest');
"
```

**Expected:**
- Name: "TASALO — Tasas de Cambio Cuba"
- Version: 0.2.0
- Manifest: 3
- Permissions: storage, alarms, tabs

---

## 🔧 Installation Tests

### Test 1: Chrome Installation

**Steps:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `taso-ext/` folder

**Expected Results:**
- ✅ Extension appears in list
- ✅ No errors in console
- ✅ Icon appears in toolbar
- ✅ Badge shows "USD" rate (or "ERR" if API down)

**Debug if fails:**
- Check `chrome://extensions/` → TASALO → "Service Worker" → Inspect
- Look for errors in console

---

### Test 2: First Launch

**Steps:**
1. Click extension icon in toolbar
2. Popup should open

**Expected Results:**
- ✅ Shows loading spinner initially
- ✅ Loads rates within 3 seconds
- ✅ Displays 3-column grid
- ✅ Cards show: EUR, USD, MLC, BTC, etc.
- ✅ Change indicators: 🔺/🔻/―
- ✅ Update time shown (e.g., "14:30")
- ✅ Green dot = API connected

**Debug if fails:**
- Check popup console (right-click → Inspect)
- Check service worker logs
- Verify API is running: `curl http://localhost:8040/api/v1/tasas/latest`

---

## 🧪 Functional Tests

### Test 3: Popup Display

**Verify:**
- [ ] Header shows "TASALO / Tasas de cambio"
- [ ] Update dot is green (ok), red (error), or blue (loading)
- [ ] Refresh button (🔄) works
- [ ] Settings button (⚙️) opens options
- [ ] Rates grid shows 3 columns
- [ ] Each card has: currency code, flag, rate, name, change arrow
- [ ] Ticker section at bottom (collapsible)
- [ ] Ticker scrolls horizontally
- [ ] Footer shows update interval

**Visual Check:**
- Glassmorphism effect visible
- Hover effects on cards
- Smooth animations
- No layout shifts

---

### Test 4: Manual Refresh

**Steps:**
1. Click 🔄 button in popup header
2. Button should spin
3. Rates should update

**Expected:**
- ✅ Button spins (0.6s animation)
- ✅ Update dot turns blue (loading)
- ✅ New rates appear within 2 seconds
- ✅ Update time changes
- ✅ Button stops spinning

---

### Test 5: Auto Refresh

**Steps:**
1. Set update interval to 1 minute (Options → General)
2. Wait 60 seconds
3. Observe popup

**Expected:**
- ✅ Rates update automatically after 1 minute
- ✅ No user interaction needed
- ✅ Service worker logs show alarm trigger

**Debug:**
- Check `chrome://extensions/` → Service Worker → Console
- Look for: `[ALARM] Alarm triggered: refresh`

---

### Test 6: New Tab Page

**Steps:**
1. Open new tab (Ctrl+T / Cmd+T)
2. TASALO dashboard should appear

**Expected:**
- ✅ Ticker at top (Binance crypto)
- ✅ Two panels: ElToque (left), BCC (right)
- ✅ Each panel has 3-column grid
- ✅ Clock shows current time (updating every second)
- ✅ Date shows full date
- ✅ Theme toggle buttons work
- ✅ Search bar functional
- ✅ Search hints clickable
- ✅ Year Progress widget shows percentage
- ✅ Footer with version and refresh link

**Visual Check:**
- Animated blobs in background
- Glassmorphism on panels
- Hover effects on cards
- Responsive layout

---

### Test 7: Omnibox

**Steps:**
1. Type `tsl` in address bar
2. Press Tab or Space
3. Type currency code (e.g., `USD`)
4. Press Enter

**Expected:**
- ✅ Suggestions appear as you type
- ✅ Shows: "USD ↑ 515 CUP — Dólar (subió)"
- ✅ Enter opens new tab with that currency highlighted
- ✅ Empty `tsl` shows all rates

**Test queries:**
- `tsl` → All rates
- `tsl USD` → USD rate
- `tsl EUR` → EUR rate
- `tsl BTC` → BTC price

---

### Test 8: Options Page

**Steps:**
1. Right-click extension icon → "Options"
2. Navigate through sections

**Test General Section:**
- [ ] Update interval slider (1-60 min)
- [ ] Theme toggle (Auto/Dark/Light)
- [ ] Icon rotation toggle
- [ ] Rotation speed slider (1-10 sec)
- [ ] Changes save correctly

**Test Display Section:**
- [ ] Font size slider (10-20 px)
- [ ] Show flags toggle
- [ ] Show timestamp toggle
- [ ] Compact mode toggle
- [ ] Color pickers work

**Test Currencies Section:**
- [ ] List shows available currencies
- [ ] Checkboxes work
- [ ] "Select all" / "Deselect all" work
- [ ] Selection saves correctly

**Test About Section:**
- [ ] Version shows (0.2.0)
- [ ] Sources list correct
- [ ] Features list correct
- [ ] GitHub link works
- [ ] taso-api link works

**Save Test:**
1. Change some settings
2. Click "Guardar cambios"
3. Toast appears: "Configuración guardada"
4. Reload popup → changes applied

---

### Test 9: Theme Toggle

**Steps:**
1. Go to Options → General
2. Click "Dark" → Save
3. Open popup → should be dark
4. Click "Light" → Save
5. Open popup → should be light
6. Click "Auto" → Save
7. Open popup → should follow system

**Expected:**
- ✅ CSS variables change
- ✅ Background colors invert
- ✅ Text colors invert
- ✅ Blobs still visible
- ✅ Smooth transition

---

### Test 10: Storage Persistence

**Steps:**
1. Change settings in Options
2. Save
3. Close browser completely
4. Reopen browser
5. Check settings

**Expected:**
- ✅ Settings persist after restart
- ✅ Rates still in cache
- ✅ No need to reconfigure

---

## 🐛 Error Handling Tests

### Test 11: API Down

**Steps:**
1. Stop taso-api
2. Click refresh in popup

**Expected:**
- ✅ Error banner appears: "Error al conectar"
- ✅ Update dot turns red
- ✅ Last cached rates still show
- ✅ Badge shows "ERR"
- ✅ Toast notification (if enabled)

**Recovery:**
1. Start taso-api
2. Click refresh
3. Should recover automatically

---

### Test 12: Slow API

**Steps:**
1. Add artificial delay to taso-api (e.g., 10 seconds)
2. Click refresh

**Expected:**
- ✅ Loading spinner shows
- ✅ Update dot turns blue
- ✅ Eventually times out (15s)
- ✅ Shows error message
- ✅ Doesn't crash extension

---

### Test 13: Invalid Response

**Steps:**
1. Modify API to return invalid JSON
2. Click refresh

**Expected:**
- ✅ Error handled gracefully
- ✅ Shows: "Invalid API response"
- ✅ Uses cached data
- ✅ No crash

---

## 📱 Responsive Tests

### Test 14: Mobile Layout

**Steps:**
1. Open popup
2. Resize browser window (if possible)
3. Or test on small screen

**Expected:**
- ✅ 3 columns → 1 column on very small screens
- ✅ Cards stack vertically
- ✅ Ticker still scrolls
- ✅ All text readable
- ✅ No horizontal scroll

---

### Test 15: New Tab Responsive

**Steps:**
1. Open new tab
2. Resize window

**Expected:**
- ✅ 2 panels → 1 panel below 768px
- ✅ Search bar scales
- ✅ Year widget adapts
- ✅ Clock stays readable

---

## 🎨 Visual Tests

### Test 16: Glassmorphism

**Verify on all pages:**
- [ ] Backdrop blur visible
- [ ] Semi-transparent backgrounds
- [ ] Specular highlights on hover
- [ ] Border glow on accent elements
- [ ] Shadows create depth

**Check:**
- Popup cards
- New tab panels
- Options sections
- Buttons and inputs

---

### Test 17: Animations

**Verify:**
- [ ] Blobs animate smoothly (25s loop)
- [ ] Ticker scrolls continuously
- [ ] Refresh button spins (0.6s)
- [ ] Cards hover transform (0.25s)
- [ ] Toggle switches slide (0.3s)
- [ ] Toast slides in/out (0.3s)
- [ ] Section transitions (0.3s fade)

**Performance:**
- All animations at 60fps
- No jank or stuttering
- Smooth easing curves

---

## 🔍 Cross-Browser Tests

### Test 18: Chrome

**Version:** 88+

**Test:**
- [ ] Installation works
- [ ] All features work
- [ ] No console errors
- [ ] Service worker stays alive
- [ ] Alarms trigger correctly

---

### Test 19: Edge

**Version:** 88+ (Chromium)

**Test:**
- [ ] Installation works
- [ ] All features work
- [ ] No compatibility issues

---

### Test 20: Brave

**Version:** Latest

**Test:**
- [ ] Installation works
- [ ] All features work
- [ ] Brave shields don't block API

---

### Test 21: Firefox

**Version:** 109+

**Test:**
- [ ] Temporary installation works
- [ ] All features work
- [ ] `browser.*` API compatible
- [ ] Manifest V3 supported

**Note:** Firefox requires `browser_specific_settings` in manifest

---

## 📊 Performance Tests

### Test 22: Load Time

**Measure:**
- Popup open: < 200ms
- New tab load: < 500ms
- Options load: < 300ms
- First rate fetch: < 3s

**Tools:**
- Chrome DevTools → Performance tab
- Measure from click to render

---

### Test 23: Memory Usage

**Check:**
- Service worker memory: < 50MB
- Popup memory: < 30MB
- No memory leaks over time

**Tools:**
- `chrome://extensions/` → TASALO → "Service Worker" → Inspect
- DevTools → Memory tab

---

### Test 24: Battery Impact

**Monitor:**
- Service worker wakes only on alarm (5 min)
- No continuous polling
- Animations pause when hidden
- No unnecessary re-renders

---

## ✅ Final Checklist

Before release, verify:

### Code Quality
- [ ] All JS syntax valid (`node --check`)
- [ ] No console errors
- [ ] No TODO comments in production code
- [ ] Consistent code style

### Documentation
- [ ] README.md complete
- [ ] AGENTS.md helpful
- [ ] CHANGELOG.md updated
- [ ] Installation instructions clear

### Testing
- [ ] All functional tests pass
- [ ] All visual tests pass
- [ ] Cross-browser tested
- [ ] Error handling tested

### Polish
- [ ] No placeholder text ("lorem ipsum")
- [ ] All icons render correctly
- [ ] All links work
- [ ] Version numbers consistent (0.2.0)

### Security
- [ ] No API keys in code
- [ ] No sensitive data logged
- [ ] CORS properly configured
- [ ] No eval() or unsafe patterns

---

## 🐛 Bug Report Template

If you find a bug, report with:

```markdown
**Description:**
What happened?

**Steps to Reproduce:**
1. Go to...
2. Click...
3. See error...

**Expected:**
What should happen?

**Environment:**
- Browser: Chrome 120 / Firefox 115 / etc.
- OS: Windows 11 / macOS / Linux
- Extension version: 0.2.0

**Screenshots:**
If applicable

**Console Logs:**
From service worker / popup / new tab
```

---

## 📝 Test Results Template

```markdown
# Test Results - v0.2.0

**Date:** 2026-03-29
**Tester:** [Your name]
**Browser:** Chrome 120, Firefox 115
**OS:** Windows 11

## Summary
- Total tests: 24
- Passed: 24
- Failed: 0
- Skipped: 0

## Issues Found
None! 🎉

## Notes
- All features working as expected
- Performance excellent
- Design beautiful
```

---

**Happy Testing! 🚀**
