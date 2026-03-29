// ═══════════════════════════════════════════════
//  TASALO — Background Service Worker v1
//  Fetch rates from taso-api, manage storage, handle alarms
// ═══════════════════════════════════════════════

import {
  DEFAULT_API_URL,
  PRODUCTION_API_URL,
  ALARMS,
  PREFERRED_ORDER,
  CURRENCY_META,
  DEFAULT_SETTINGS,
  deepClone,
  log,
  browser,
} from './constants.js';

// ═══════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════
let cachedRates = {};
let cachedChanges = {};
let cachedSettings = deepClone(DEFAULT_SETTINGS);

// ═══════════════════════════════════════════════
//  Initialization
// ═══════════════════════════════════════════════
browser.runtime.onInstalled.addListener(async () => {
  log('Extension installed', 'INIT');
  
  // Initialize storage with defaults
  const stored = await browser.storage.local.get('settings');
  if (!stored.settings) {
    await browser.storage.local.set({ settings: deepClone(DEFAULT_SETTINGS) });
  }
  
  // Setup alarms
  await setupAlarms();
  
  // Initial fetch
  await fetchRates();
});

browser.runtime.onStartup.addListener(async () => {
  log('Browser started', 'INIT');
  await setupAlarms();
  await fetchRates();
});

// ═══════════════════════════════════════════════
//  Alarms
// ═══════════════════════════════════════════════
async function setupAlarms() {
  await browser.alarms.clearAll();
  
  const interval = cachedSettings.updateInterval ?? 5;
  
  // Refresh alarm
  browser.alarms.create(ALARMS.REFRESH, {
    delayInMinutes: interval,
    periodInMinutes: interval,
  });
  
  // Rotation alarm (for icon badge)
  browser.alarms.create(ALARMS.ROTATE, {
    delayInMinutes: 1,
    periodInMinutes: 1,
  });
  
  log(`Alarms set: refresh every ${interval} min`, 'CONFIG');
}

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARMS.REFRESH) {
    log('Alarm triggered: refresh', 'ALARM');
    await fetchRates();
  }
  
  if (alarm.name === ALARMS.ROTATE) {
    await rotateIcon();
  }
});

// ═══════════════════════════════════════════════
//  Rate Fetching
// ═══════════════════════════════════════════════
async function fetchRates() {
  try {
    const apiUrl = cachedSettings.apiUrl || DEFAULT_API_URL;
    
    log(`Fetching from ${apiUrl}`, 'FETCH');
    
    const response = await fetch(`${apiUrl}/api/v1/tasas/latest`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.ok || !data.data) {
      throw new Error('Invalid API response structure');
    }
    
    // Extract rates from all sources
    const rates = extractAllRates(data.data);
    
    // Calculate changes
    const changes = calculateChanges(rates, cachedRates);
    
    // Update cache
    cachedRates = rates;
    cachedChanges = changes;
    
    // Save to storage
    const now = new Date().toISOString();
    await browser.storage.local.set({
      currentRates: rates,
      rateChanges: changes,
      lastUpdated: now,
      fetchError: null,
    });
    
    log(`✅ Fetched ${Object.keys(rates).length} rates`, 'SUCCESS');
    
    // Update icon badge
    await updateBadge();
    
    // Notify tabs
    broadcastToTabs({
      type: 'RATES_UPDATED',
      rates,
      changes,
      lastUpdated: now,
    });
    
  } catch (error) {
    log(`❌ Fetch error: ${error.message}`, 'ERROR');
    
    // Save error state
    await browser.storage.local.set({
      fetchError: error.message,
    });
    
    // Update badge with error
    setBadgeText('ERR', '#dc2626');
  }
}

function extractAllRates(data) {
  const rates = {};
  
  // Extract from each source
  const sources = ['eltoque', 'cadeca', 'bcc', 'binance'];
  
  for (const source of sources) {
    if (data[source]) {
      const sourceRates = parseSourceRates(data[source], source);
      Object.assign(rates, sourceRates);
    }
  }
  
  return rates;
}

function parseSourceRates(sourceData, source) {
  const rates = {};
  
  if (Array.isArray(sourceData)) {
    // Array format: [{ currency, rate, ... }]
    for (const item of sourceData) {
      const currency = (item.currency || item.code || '').toUpperCase();
      const rate = extractRateValue(item);
      if (currency && rate !== null) {
        rates[currency] = rate;
      }
    }
  } else if (typeof sourceData === 'object') {
    // Object format: { USD: { rate: 515 }, ... }
    for (const [key, value] of Object.entries(sourceData)) {
      const currency = key.toUpperCase();
      const rate = extractRateValue(value);
      if (currency && rate !== null) {
        rates[currency] = rate;
      }
    }
  }
  
  return rates;
}

function extractRateValue(item) {
  if (typeof item === 'number') return item;
  if (typeof item === 'string') {
    return parseFloat(item.replace(',', '.')) || null;
  }
  if (typeof item === 'object' && item !== null) {
    // Try common field names
    const rate = item.rate || item.price || item.value || item.tasa;
    if (typeof rate === 'number') return rate;
    if (typeof rate === 'string') {
      return parseFloat(rate.replace(',', '.')) || null;
    }
  }
  return null;
}

function calculateChanges(current, previous) {
  const changes = {};
  
  for (const [currency, rate] of Object.entries(current)) {
    const prev = previous[currency];
    
    if (prev === undefined) {
      changes[currency] = 'new';
    } else if (rate > prev) {
      changes[currency] = 'up';
    } else if (rate < prev) {
      changes[currency] = 'down';
    } else {
      changes[currency] = 'neutral';
    }
  }
  
  return changes;
}

// ═══════════════════════════════════════════════
//  Icon Badge
// ═══════════════════════════════════════════════
async function updateBadge() {
  const currency = 'USD'; // Default badge currency
  const rate = cachedRates[currency];
  
  if (rate !== undefined) {
    const text = formatBadgeValue(rate);
    const change = cachedChanges[currency];
    const color = getBadgeColor(change);
    setBadgeText(text, color);
  }
}

async function rotateIcon() {
  if (!cachedSettings.iconRotateEnabled) {
    await updateBadge();
    return;
  }
  
  const currencies = getOrderedCurrencies();
  if (currencies.length === 0) return;
  
  // Get rotation state
  const data = await browser.storage.local.get('rotateState');
  const state = data.rotateState || { index: 0, lastTime: Date.now() };
  
  const intervalMs = (cachedSettings.iconRotateInterval || 2) * 1000;
  const elapsed = Date.now() - state.lastTime;
  const steps = Math.max(1, Math.floor(elapsed / intervalMs));
  const newIndex = (state.index + steps) % currencies.length;
  
  // Update state
  await browser.storage.local.set({
    rotateState: { index: newIndex, lastTime: Date.now() }
  });
  
  // Update badge with new currency
  const currency = currencies[newIndex];
  const rate = cachedRates[currency];
  if (rate !== undefined) {
    const text = formatBadgeValue(rate);
    const change = cachedChanges[currency];
    const color = getBadgeColor(change);
    setBadgeText(text, color);
  }
}

function getOrderedCurrencies() {
  const order = cachedSettings.currencyOrder?.length 
    ? cachedSettings.currencyOrder 
    : PREFERRED_ORDER;
  const selected = cachedSettings.selectedCurrencies || [];
  const all = Object.keys(cachedRates);
  
  const sorted = [...all].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  
  return selected.length > 0 
    ? sorted.filter(c => selected.includes(c)) 
    : sorted;
}

function formatBadgeValue(rate) {
  if (rate >= 1000000) return (rate / 1000000).toFixed(1) + 'M';
  if (rate >= 100000) return Math.round(rate / 1000) + 'k';
  if (rate >= 10000) return (rate / 1000).toFixed(1) + 'k';
  if (rate >= 1000) return String(Math.round(rate));
  return rate % 1 === 0 ? String(rate) : rate.toFixed(1);
}

function getBadgeColor(change) {
  switch (change) {
    case 'up': return '#ff6b6b';
    case 'down': return '#4ade80';
    default: return '#1e1e38';
  }
}

function setBadgeText(text, bgColor) {
  try {
    browser.action.setBadgeText({ text });
    browser.action.setBadgeBackgroundColor({ color: bgColor });
  } catch (e) {
    log(`Badge error: ${e.message}`, 'WARN');
  }
}

// ═══════════════════════════════════════════════
//  Message Handling
// ═══════════════════════════════════════════════
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FETCH_NOW') {
    fetchRates().then(() => sendResponse({ ok: true }));
    return true; // Keep channel open for async response
  }
  
  if (msg.type === 'GET_RATES') {
    sendResponse({ 
      rates: cachedRates, 
      changes: cachedChanges,
      settings: cachedSettings 
    });
  }
  
  if (msg.type === 'RESET_SETTINGS') {
    browser.storage.local.set({ settings: deepClone(DEFAULT_SETTINGS) })
      .then(async () => {
        cachedSettings = deepClone(DEFAULT_SETTINGS);
        await setupAlarms();
        sendResponse({ ok: true });
      });
    return true;
  }
  
  if (msg.type === 'UPDATE_SETTINGS') {
    cachedSettings = { ...cachedSettings, ...msg.settings };
    setupAlarms();
    sendResponse({ ok: true });
  }
});

// ═══════════════════════════════════════════════
//  Omnibox
// ═══════════════════════════════════════════════
browser.omnibox.onInputStarted.addListener(() => {
  browser.omnibox.setDefaultSuggestion({
    description: 'TASALO — escribe una moneda (USD, EUR, BTC...) o Enter para ver todo'
  });
});

browser.omnibox.onInputChanged.addListener((text, suggest) => {
  const query = text.trim().toUpperCase();
  const currencies = getOrderedCurrencies();
  const suggestions = [];
  
  for (const currency of currencies) {
    const rate = cachedRates[currency];
    if (!rate) continue;
    
    const change = cachedChanges[currency] || 'neutral';
    const arrow = change === 'up' ? '↑' : change === 'down' ? '↓' : '-';
    const meta = CURRENCY_META[currency] || { name: currency };
    const price = formatBadgeValue(rate);
    
    if (query && !currency.startsWith(query) && 
        !meta.name.toUpperCase().includes(query)) {
      continue;
    }
    
    const label = change === 'up' ? 'subió' : change === 'down' ? 'bajó' : 'estable';
    suggestions.push({
      content: currency,
      description: `${currency} ${arrow} ${price} CUP — ${meta.name} (${label})`
    });
  }
  
  if (suggestions.length === 0 && query) {
    suggestions.push({
      content: '',
      description: `No encontrado: "${text}" — prueba EUR, USD, MLC, BTC`
    });
  }
  
  suggest(suggestions);
});

browser.omnibox.onInputEntered.addListener((text, disposition) => {
  const url = browser.runtime.getURL('src/newtab.html') + 
              (text ? `#${text.toUpperCase()}` : '');
  
  if (disposition === 'currentTab') {
    browser.tabs.update({ url });
  } else {
    browser.tabs.create({ url });
  }
});

// ═══════════════════════════════════════════════
//  Utilities
// ═══════════════════════════════════════════════
function broadcastToTabs(message) {
  browser.tabs.query({}).then(tabs => {
    for (const tab of tabs) {
      if (tab.id && tab.url && 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith('about:')) {
        browser.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  }).catch(() => {});
}

// Initial setup
log('Service worker loaded', 'INIT');
