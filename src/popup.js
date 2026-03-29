// ═══════════════════════════════════════════════
//  TASALO — Popup
//  Versión simplificada
// ═══════════════════════════════════════════════

import { PREFERRED_ORDER, CURRENCY_META, DEFAULT_SETTINGS } from './constants.js';

const browser = globalThis.browser || chrome;

let settings = { ...DEFAULT_SETTINGS };
let currentRates = {};
let rateChanges = {};
let previousRates = {};
let binanceRates = {};
let tickerOpen = false;

const DEFAULT_BINANCE_CURRENCIES = [
  'BTC', 'ETH', 'BNB', 'XRP', 'ADA',
  'DOGE', 'SOL', 'TRX', 'DOT', 'MATIC'
];

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] DOMContentLoaded');
  
  try {
    // Load from storage
    const data = await browser.storage.local.get([
      'settings', 'currentRates', 'previousRates',
      'rateChanges', 'binanceRates', 'lastUpdated', 'fetchError'
    ]);
    
    console.log('[Popup] Storage data:', data);
    
    settings = data.settings || DEFAULT_SETTINGS;
    currentRates = data.currentRates || {};
    previousRates = data.previousRates || {};
    rateChanges = data.rateChanges || {};
    binanceRates = data.binanceRates || {};
    
    // UI state
    const uiState = await browser.storage.local.get('popupUiState');
    tickerOpen = (uiState.popupUiState && uiState.popupUiState.tickerOpen) ?? false;
    
    // Render
    updateUI(data.lastUpdated, data.fetchError);
    renderGrid();
    renderBinanceTicker();
    
    // Listeners
    attachListeners();
    
    // Listen for storage changes
    browser.storage.onChanged.addListener((changes) => {
      if (changes.currentRates || changes.rateChanges || changes.binanceRates) {
        if (changes.currentRates) currentRates = changes.currentRates.newValue || {};
        if (changes.rateChanges) rateChanges = changes.rateChanges.newValue || {};
        if (changes.binanceRates) binanceRates = changes.binanceRates.newValue || {};
        
        renderGrid();
        renderBinanceTicker();
        updateUI(changes.lastUpdated?.newValue, changes.fetchError?.newValue);
      }
    });
    
  } catch (error) {
    console.error('[Popup] Error loading:', error);
    showError('Error cargando datos: ' + error.message);
  }
});

function updateUI(lastUpdated, fetchError) {
  const updateInfo = document.getElementById('updateInfo');
  const errorBanner = document.getElementById('errorBanner');
  const errorMsg = document.getElementById('errorMsg');
  const updateDot = document.getElementById('updateDot');
  
  // Update time
  if (updateInfo && lastUpdated) {
    updateInfo.textContent = fmtTime(lastUpdated);
  }
  
  // Error state
  if (fetchError) {
    if (updateDot) updateDot.className = 'update-dot error';
    if (errorBanner) errorBanner.style.display = 'flex';
    if (errorMsg) errorMsg.textContent = fetchError;
  } else if (Object.keys(currentRates).length > 0) {
    if (updateDot) updateDot.className = 'update-dot ok';
    if (errorBanner) errorBanner.style.display = 'none';
  } else {
    if (updateDot) updateDot.className = 'update-dot loading';
    if (errorBanner) errorBanner.style.display = 'none';
  }
  
  // Footer interval
  const footerInterval = document.getElementById('footerInterval');
  if (footerInterval) {
    const iv = settings.updateInterval ?? 5;
    footerInterval.textContent = `cada ${iv < 60 ? iv + ' min' : (iv / 60).toFixed(1) + ' h'}`;
  }
}

function showError(msg) {
  const errorBanner = document.getElementById('errorBanner');
  const errorMsg = document.getElementById('errorMsg');
  const updateDot = document.getElementById('updateDot');
  
  if (updateDot) updateDot.className = 'update-dot error';
  if (errorBanner) errorBanner.style.display = 'flex';
  if (errorMsg) errorMsg.textContent = msg || 'Error desconocido';
}

// ── Render Grid ────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('ratesGrid');
  const loading = document.getElementById('ratesLoading');
  
  if (!grid || !loading) return;
  
  const hasRates = Object.keys(currentRates).length > 0;
  loading.style.display = hasRates ? 'none' : 'flex';
  grid.style.display = hasRates ? 'grid' : 'none';
  
  if (!hasRates) return;
  
  const source = settings.sourcePreference || 'eltoque';
  let currencies = [];
  
  if (source === 'eltoque') {
    currencies = ['EUR', 'USD', 'MLC', 'BTC', 'TRX', 'USDT'];
  } else if (source === 'bcc') {
    currencies = ['EUR', 'USD', 'CAD', 'GBP', 'CHF', 'MXN'];
  }
  
  // Filter to available
  currencies = currencies.filter(c => currentRates[c] !== undefined);
  
  const cols = currencies.length <= 2 ? 'cols-2' : '';
  grid.className = 'rates-grid ' + cols;
  grid.innerHTML = '';
  
  const showFlags = settings.showCurrencyFlag !== false;
  const fontSize = settings.fontSize ?? 13;
  
  for (const cur of currencies) {
    const val = currentRates[cur];
    if (val === undefined) continue;
    
    const change = rateChanges[cur] || 'neutral';
    const prev = previousRates[cur];
    const meta = CURRENCY_META[cur] || { name: cur, flag: '💱' };
    const diff = prev !== undefined ? val - prev : null;
    const arrow = change === 'up' ? '▲' : change === 'down' ? '▼' : '—';
    
    const card = document.createElement('div');
    card.className = `rate-card ${change}`;
    
    card.innerHTML = `
      <div class="rate-top">
        <span class="rate-cur">${cur}</span>
        ${showFlags ? `<span class="rate-flag">${meta.flag}</span>` : ''}
      </div>
      <div class="rate-val" style="font-size:${fontSize + 4}px">${fmtRate(val)}</div>
      <div class="rate-bot">
        <span class="rate-name">${meta.name}</span>
        <span class="rate-diff">${arrow}${diff !== null && diff !== 0 ? (diff > 0 ? '+' : '') + diff.toFixed(1) : ''}</span>
      </div>
    `;
    
    grid.appendChild(card);
  }
}

// ── Render Binance Ticker ─────────────────────
function renderBinanceTicker() {
  const strip = document.getElementById('tickerStrip');
  if (!strip) return;
  
  const currencies = settings.tickerCurrencies || DEFAULT_BINANCE_CURRENCIES;
  
  if (Object.keys(binanceRates).length === 0) {
    strip.innerHTML = '<span style="padding:0 16px;font-size:9px;color:var(--text3);font-family:var(--mono)">Sin datos de Binance</span>';
    return;
  }
  
  const itemsHtml = currencies
    .filter(cur => binanceRates[cur] !== undefined)
    .map(cur => {
      const rate = binanceRates[cur];
      return `<span class="t-item bnc">` +
        `<span class="t-cur">${cur}</span>` +
        `<span class="t-val">${rate.toFixed(2)}</span>` +
        `<span class="t-unit">USDT</span>` +
        `</span><span class="tsep">·</span>`;
    })
    .join('');
  
  if (!itemsHtml) {
    strip.innerHTML = '<span style="padding:0 16px;font-size:9px;color:var(--text3);font-family:var(--mono)">Sin datos</span>';
    return;
  }
  
  strip.innerHTML = itemsHtml + itemsHtml;
  
  const duration = Math.max(15, currencies.length * 0.4);
  strip.style.animationDuration = `${duration}s`;
  document.documentElement.style.setProperty('--ticker-dur', `${duration}s`);
}

// ── Listeners ─────────────────────────────────
function attachListeners() {
  const btnRefresh = document.getElementById('btnRefresh');
  const btnSettings = document.getElementById('btnSettings');
  const tickerToggle = document.getElementById('tickerToggle');
  
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.classList.add('spinning');
      btnRefresh.disabled = true;
      
      try {
        // Try to send message to background
        await browser.runtime.sendMessage({ type: 'FETCH_NOW' });
        
        // Reload data
        const data = await browser.storage.local.get([
          'currentRates', 'rateChanges', 'binanceRates',
          'lastUpdated', 'fetchError'
        ]);
        
        currentRates = data.currentRates || {};
        rateChanges = data.rateChanges || {};
        binanceRates = data.binanceRates || {};
        
        renderGrid();
        renderBinanceTicker();
        updateUI(data.lastUpdated, data.fetchError);
        
      } catch (error) {
        console.error('[Popup] Refresh error:', error);
        showError('Error al actualizar: ' + error.message);
      } finally {
        btnRefresh.classList.remove('spinning');
        btnRefresh.disabled = false;
      }
    });
  }
  
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
  }
  
  if (tickerToggle) {
    tickerToggle.addEventListener('click', () => {
      tickerOpen = !tickerOpen;
      const body = document.getElementById('tickerBody');
      const chevron = document.getElementById('tickerChevron');
      
      if (body) body.classList.toggle('open', tickerOpen);
      if (chevron) chevron.classList.toggle('open', tickerOpen);
      
      browser.storage.local.set({ popupUiState: { tickerOpen } });
    });
  }
}

// ── Utils ─────────────────────────────────────
function fmtRate(val) {
  if (val >= 10000) return val.toLocaleString('es-CU', { maximumFractionDigits: 0 });
  if (val >= 1000) return val.toLocaleString('es-CU', { maximumFractionDigits: 0 });
  return val.toFixed(val % 1 === 0 ? 0 : 1);
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}
