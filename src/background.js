// ═══════════════════════════════════════════════
//  TASALO — Background Service Worker v0.4.3
//  Compatible con Chrome y Firefox
// ═══════════════════════════════════════════════

import {
  DEFAULT_API_URL,
  ALARMS,
  PREFERRED_ORDER,
  CURRENCY_META,
  DEFAULT_SETTINGS,
  deepClone,
  log,
} from './constants.js';

// Cross-browser API wrapper
const browser = globalThis.browser || chrome;

// ═══════════════════════════════════════════════
//  State (en memoria — se pierde cuando el SW duerme)
// ═══════════════════════════════════════════════
let cachedRates = {};
let cachedChanges = {};
let cachedBinanceRates = {};
let cachedSettings = deepClone(DEFAULT_SETTINGS);

// ═══════════════════════════════════════════════
//  ✅ FIX: Cargar estado desde storage
//  El Service Worker de Chrome se termina entre alarmas y pierde su estado.
//  Hay que restaurarlo desde storage cada vez que se activa.
// ═══════════════════════════════════════════════
async function loadStateFromStorage() {
  const stored = await browser.storage.local.get([
    'settings', 'currentRates', 'rateChanges', 'binanceRates'
  ]);
  if (stored.settings)      cachedSettings     = { ...deepClone(DEFAULT_SETTINGS), ...stored.settings };
  if (stored.currentRates)  cachedRates        = stored.currentRates;
  if (stored.rateChanges)   cachedChanges      = stored.rateChanges;
  if (stored.binanceRates)  cachedBinanceRates = stored.binanceRates;
}

// ═══════════════════════════════════════════════
//  Initialization
// ═══════════════════════════════════════════════
browser.runtime.onInstalled.addListener(async () => {
  log('Extension installed', 'INIT');

  const stored = await browser.storage.local.get('settings');
  if (!stored.settings) {
    await browser.storage.local.set({ settings: deepClone(DEFAULT_SETTINGS) });
  } else {
    cachedSettings = { ...deepClone(DEFAULT_SETTINGS), ...stored.settings };
  }

  await setupAlarms();
  await fetchRates();
});

browser.runtime.onStartup.addListener(async () => {
  log('Browser started', 'INIT');
  await loadStateFromStorage(); // ✅ FIX: Restaurar estado al arrancar
  await setupAlarms();
  await fetchRates();
});

// ═══════════════════════════════════════════════
//  Alarms
// ═══════════════════════════════════════════════
async function setupAlarms() {
  await browser.alarms.clearAll();

  const interval = cachedSettings.updateInterval ?? 5;

  browser.alarms.create(ALARMS.REFRESH, {
    delayInMinutes: interval,
    periodInMinutes: interval,
  });

  // Alarma de rotación: cada 1 minuto (mínimo permitido en Chrome MV3).
  // rotateIcon() calcula cuántos pasos de N segundos caben en el tiempo transcurrido.
  browser.alarms.create(ALARMS.ROTATE, {
    delayInMinutes: 1,
    periodInMinutes: 1,
  });

  log(`Alarms set: refresh every ${interval} min, rotate every 1 min`, 'CONFIG');
}

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARMS.REFRESH) {
    log('Alarm triggered: refresh', 'ALARM');
    await loadStateFromStorage(); // ✅ FIX: Recargar estado antes de usar
    await fetchRates();
  }

  if (alarm.name === ALARMS.ROTATE) {
    await loadStateFromStorage(); // ✅ FIX: Recargar estado antes de rotar
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

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const data = await response.json();

    if (!data.ok || !data.data) throw new Error('Invalid API response structure');

    const rates      = extractAllRates(data.data);
    const binanceRates = extractBinanceRates(data.data.binance);
    const changes    = calculateChanges(rates, cachedRates);

    cachedRates        = rates;
    cachedChanges      = changes;
    cachedBinanceRates = binanceRates;

    const now = new Date().toISOString();
    await browser.storage.local.set({
      currentRates:  rates,
      rateChanges:   changes,
      binanceRates:  binanceRates,
      lastUpdated:   now,
      fetchError:    null,
    });

    log(`✅ Fetched ${Object.keys(rates).length} rates, ${Object.keys(binanceRates).length} binance`, 'SUCCESS');

    await updateBadge();

    broadcastToTabs({
      type: 'RATES_UPDATED',
      rates,
      changes,
      binanceRates,
      lastUpdated: now,
    });

  } catch (error) {
    log(`❌ Fetch error: ${error.message}`, 'ERROR');
    await browser.storage.local.set({ fetchError: error.message });
    setBadgeText('ERR', '#dc2626');
  }
}

function extractAllRates(data) {
  const rates = {};
  for (const source of ['eltoque', 'cadeca', 'bcc']) {
    if (data[source]) Object.assign(rates, parseSourceRates(data[source], source));
  }
  return rates;
}

function extractBinanceRates(binanceData) {
  if (!binanceData || typeof binanceData !== 'object') return {};
  const rates = {};
  for (const [currency, value] of Object.entries(binanceData)) {
    const rate = extractRateValue(value);
    if (rate !== null) rates[currency] = rate;
  }
  return rates;
}

function parseSourceRates(sourceData) {
  const rates = {};
  if (Array.isArray(sourceData)) {
    for (const item of sourceData) {
      const currency = (item.currency || item.code || '').toUpperCase();
      const rate = extractRateValue(item);
      if (currency && rate !== null) rates[currency] = rate;
    }
  } else if (typeof sourceData === 'object') {
    for (const [key, value] of Object.entries(sourceData)) {
      const rate = extractRateValue(value);
      if (rate !== null) rates[key.toUpperCase()] = rate;
    }
  }
  return rates;
}

function extractRateValue(item) {
  if (typeof item === 'number') return item;
  if (typeof item === 'string') return parseFloat(item.replace(',', '.')) || null;
  if (typeof item === 'object' && item !== null) {
    const rate = item.rate || item.price || item.value || item.tasa;
    if (typeof rate === 'number') return rate;
    if (typeof rate === 'string') return parseFloat(rate.replace(',', '.')) || null;
  }
  return null;
}

function calculateChanges(current, previous) {
  const changes = {};
  for (const [currency, rate] of Object.entries(current)) {
    const prev = previous[currency];
    if (prev === undefined) changes[currency] = 'new';
    else if (rate > prev)   changes[currency] = 'up';
    else if (rate < prev)   changes[currency] = 'down';
    else                    changes[currency] = 'neutral';
  }
  return changes;
}

// ═══════════════════════════════════════════════
//  Icon Badge
// ═══════════════════════════════════════════════
async function updateBadge() {
  const rate = cachedRates['USD'];
  if (rate !== undefined) {
    setBadgeText(formatBadgeValue(rate), getBadgeColor(cachedChanges['USD']));
    try { browser.action.setTitle({ title: `TASALO — USD: ${formatBadgeValue(rate)} CUP` }); } catch (e) {}
  }
}

// ✅ FIX: rotateIcon ahora funciona porque loadStateFromStorage() fue llamado antes
async function rotateIcon() {
  if (!cachedSettings.iconRotateEnabled) {
    await updateBadge();
    return;
  }

  const currencies = getOrderedCurrencies();
  if (currencies.length === 0) return;

  const data  = await browser.storage.local.get('rotateState');
  const state = data.rotateState || { index: 0, lastTime: Date.now() };

  // Calcular cuántos pasos de N segundos caben en el tiempo transcurrido
  const intervalMs = (cachedSettings.iconRotateInterval || 2) * 1000;
  const elapsed    = Date.now() - state.lastTime;
  const steps      = Math.max(1, Math.floor(elapsed / intervalMs));
  const newIndex   = (state.index + steps) % currencies.length;

  await browser.storage.local.set({
    rotateState: { index: newIndex, lastTime: Date.now() }
  });

  const currency = currencies[newIndex];
  const rate     = cachedRates[currency];

  if (rate !== undefined) {
    setBadgeText(formatBadgeValue(rate), getBadgeColor(cachedChanges[currency]));
    try {
      browser.action.setTitle({ title: `TASALO — ${currency}: ${formatBadgeValue(rate)} CUP` });
    } catch (e) {}
  }
}

function getOrderedCurrencies() {
  const order    = cachedSettings.currencyOrder?.length ? cachedSettings.currencyOrder : PREFERRED_ORDER;
  const selected = cachedSettings.selectedCurrencies || [];
  const all      = Object.keys(cachedRates);

  const sorted = [...all].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return selected.length > 0 ? sorted.filter(c => selected.includes(c)) : sorted;
}

function formatBadgeValue(rate) {
  if (rate >= 1000000) return (rate / 1000000).toFixed(1) + 'M';
  if (rate >= 100000)  return Math.round(rate / 1000) + 'k';
  if (rate >= 10000)   return (rate / 1000).toFixed(1) + 'k';
  if (rate >= 1000)    return String(Math.round(rate));
  return rate % 1 === 0 ? String(rate) : rate.toFixed(1);
}

function getBadgeColor(change) {
  switch (change) {
    case 'up':   return '#ff6b6b';
    case 'down': return '#4ade80';
    default:     return '#1e1e38';
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
    return true;
  }

  if (msg.type === 'GET_RATES') {
    sendResponse({
      rates:        cachedRates,
      changes:      cachedChanges,
      binanceRates: cachedBinanceRates,
      settings:     cachedSettings,
    });
  }

  if (msg.type === 'RESET_SETTINGS') {
    browser.storage.local.set({ settings: deepClone(DEFAULT_SETTINGS) })
      .then(async () => {
        cachedSettings = deepClone(DEFAULT_SETTINGS);
        // Resetear índice de rotación
        await browser.storage.local.set({ rotateState: { index: 0, lastTime: Date.now() } });
        await setupAlarms();
        sendResponse({ ok: true });
      });
    return true;
  }

  if (msg.type === 'UPDATE_SETTINGS') {
    cachedSettings = { ...cachedSettings, ...msg.settings };
    // Resetear índice de rotación si cambió la configuración
    browser.storage.local.set({ rotateState: { index: 0, lastTime: Date.now() } });
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
    const arrow  = change === 'up' ? '↑' : change === 'down' ? '↓' : '-';
    const meta   = CURRENCY_META[currency] || { name: currency };
    const price  = formatBadgeValue(rate);

    if (query && !currency.startsWith(query) && !meta.name.toUpperCase().includes(query)) continue;

    const label = change === 'up' ? 'subió' : change === 'down' ? 'bajó' : 'estable';
    suggestions.push({
      content: currency,
      description: `${currency} ${arrow} ${price} CUP — ${meta.name} (${label})`
    });
  }

  if (suggestions.length === 0 && query) {
    suggestions.push({ content: '', description: `No encontrado: "${text}" — prueba EUR, USD, MLC, BTC` });
  }

  suggest(suggestions);
});

browser.omnibox.onInputEntered.addListener((text, disposition) => {
  if (cachedSettings.newTabEnabled === false) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(text ? `tasalo ${text}` : 'tasalo')}`;
    disposition === 'currentTab' ? browser.tabs.update({ url }) : browser.tabs.create({ url });
    return;
  }

  const url = browser.runtime.getURL('src/newtab.html') + (text ? `#${text.toUpperCase()}` : '');
  disposition === 'currentTab' ? browser.tabs.update({ url }) : browser.tabs.create({ url });
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

log('Service worker loaded (v0.4.3)', 'INIT');
