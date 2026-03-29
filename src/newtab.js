// ═══════════════════════════════════════════════
//  TASALO — New Tab Page v1
//  Liquid Glass con dos paneles (ElToque + BCC)
// ═══════════════════════════════════════════════

import { PREFERRED_ORDER, CURRENCY_META, PRODUCTION_API_URL, browser } from './constants.js';

// Estado global
let currentRates = {};
let rateChanges = {};
let binanceRates = {};
let settings = {};

// ═══════════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupTheme();
  setupClock();
  setupSearch();
  setupYearProgress();
  await loadRates();
  setupRefresh();
  
  // Escuchar cambios en storage
  browser.storage.onChanged.addListener((changes) => {
    if (changes.currentRates || changes.rateChanges) {
      loadRates();
    }
  });
});

async function loadSettings() {
  const data = await browser.storage.local.get('settings');
  settings = data.settings || {};
}

function setupTheme() {
  const theme = settings.colorBg || 'auto';
  applyTheme(theme);
  
  // Theme toggle buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme(btn.dataset.theme);
      
      // Guardar preferencia
      settings.colorBg = btn.dataset.theme;
      browser.storage.local.set({ settings });
    });
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('light');
  } else if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    // Auto - usar preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }
}

// ═══════════════════════════════════════════════
//  Clock
// ═══════════════════════════════════════════════
function setupClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const clock = document.getElementById('clock');
  const dateStr = document.getElementById('dateStr');
  
  if (clock) {
    clock.textContent = now.toLocaleTimeString('es-CU', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  if (dateStr) {
    dateStr.textContent = now.toLocaleDateString('es-CU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

// ═══════════════════════════════════════════════
//  Search
// ═══════════════════════════════════════════════
function setupSearch() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  const hints = document.querySelectorAll('.hint');
  
  function search(query) {
    if (!query) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.location.href = url;
  }
  
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        search(input.value);
      }
    });
  }
  
  if (btn) {
    btn.addEventListener('click', () => {
      if (input) search(input.value);
    });
  }
  
  hints.forEach(hint => {
    hint.addEventListener('click', () => {
      search(hint.dataset.query);
    });
  });
}

// ═══════════════════════════════════════════════
//  Year Progress
// ═══════════════════════════════════════════════
function setupYearProgress() {
  const now = new Date();
  const year = now.getFullYear();
  
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const total = end - start;
  const elapsed = now - start;
  const progress = (elapsed / total) * 100;
  
  const daysPassed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const daysRemaining = 365 - daysPassed;
  const weeksLeft = Math.ceil(daysRemaining / 7);
  
  // Update UI
  const progressEl = document.getElementById('yearProgress');
  const pctEl = document.getElementById('ywPct');
  const daysPassedEl = document.getElementById('daysPassed');
  const daysRemainingEl = document.getElementById('daysRemaining');
  const weeksLeftEl = document.getElementById('weeksLeft');
  const mticks = document.querySelectorAll('.mtick');
  
  if (progressEl) {
    setTimeout(() => {
      progressEl.style.width = `${progress.toFixed(1)}%`;
    }, 100);
  }
  
  if (pctEl) {
    pctEl.innerHTML = `${progress.toFixed(1)}% <small>completado</small>`;
  }
  
  if (daysPassedEl) daysPassedEl.textContent = daysPassed;
  if (daysRemainingEl) daysRemainingEl.textContent = daysRemaining;
  if (weeksLeftEl) weeksLeftEl.textContent = weeksLeft;
  
  // Highlight current month
  const currentMonth = now.getMonth();
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  mticks.forEach((tick, index) => {
    tick.classList.remove('past', 'now');
    if (index < currentMonth) {
      tick.classList.add('past');
    } else if (index === currentMonth) {
      tick.classList.add('now');
    }
  });
}

// ═══════════════════════════════════════════════
//  Load Rates
// ═══════════════════════════════════════════════
async function loadRates() {
  try {
    const data = await browser.storage.local.get([
      'currentRates', 
      'rateChanges', 
      'binanceRates',
      'lastUpdated'
    ]);
    
    currentRates = data.currentRates || {};
    rateChanges = data.rateChanges || {};
    binanceRates = data.binanceRates || {};
    
    renderElToquePanel();
    renderBccPanel();
    renderBinanceTicker();
    
  } catch (error) {
    console.error('Error loading rates:', error);
  }
}

function renderElToquePanel() {
  const grid = document.getElementById('eltoqueGrid');
  if (!grid) return;
  
  // ElToque currencies (informal market)
  const eltoqueCurrencies = ['EUR', 'USD', 'MLC', 'BTC', 'TRX', 'USDT'];
  
  grid.innerHTML = '';
  
  for (const currency of eltoqueCurrencies) {
    const rate = currentRates[currency];
    if (rate === undefined) continue;
    
    const change = rateChanges[currency] || 'neutral';
    const meta = CURRENCY_META[currency] || { name: currency, flag: '💱' };
    const prev = currentRates[`${currency}_prev`]; // Previous rate for comparison
    
    const card = createRateCard(currency, rate, change, meta, 'CUP');
    grid.appendChild(card);
  }
  
  // Update timestamp
  const updEl = document.getElementById('eltoqueUpd');
  if (updEl) {
    updEl.textContent = new Date().toLocaleTimeString('es-CU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

function renderBccPanel() {
  const grid = document.getElementById('bccGrid');
  if (!grid) return;
  
  // BCC currencies (official market)
  const bccCurrencies = ['EUR', 'USD', 'CAD', 'GBP', 'CHF', 'MXN'];
  
  grid.innerHTML = '';
  
  for (const currency of bccCurrencies) {
    const rate = currentRates[currency];
    if (rate === undefined) continue;
    
    const change = rateChanges[currency] || 'neutral';
    const meta = CURRENCY_META[currency] || { name: currency, flag: '💱' };
    
    const card = createRateCard(currency, rate, change, meta, 'CUP');
    grid.appendChild(card);
  }
  
  // Update timestamp
  const updEl = document.getElementById('bccUpd');
  if (updEl) {
    updEl.textContent = new Date().toLocaleTimeString('es-CU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

function createRateCard(currency, rate, change, meta, unit) {
  const card = document.createElement('div');
  card.className = `rcard ${change}`;
  
  const sizeClass = getRateSizeClass(rate);
  const arrow = change === 'up' ? '▲' : change === 'down' ? '▼' : '—';
  
  card.innerHTML = `
    <div class="rcard-top">
      <span class="rcard-sym">${currency}</span>
      <span class="rcard-ico">${meta.flag}</span>
    </div>
    <div class="rcard-val ${sizeClass}">${formatRate(rate)}</div>
    <div class="rcard-unit">${unit}</div>
    <div class="rcard-bot">
      <span class="rcard-name">${meta.name}</span>
      <span class="rcard-pct">${arrow}</span>
    </div>
  `;
  
  return card;
}

function getRateSizeClass(rate) {
  const len = formatRate(rate).length;
  if (len >= 7) return 'sz7';
  if (len >= 6) return 'sz6';
  if (len >= 5) return 'sz5';
  return 'sz4';
}

function formatRate(rate) {
  if (rate >= 1000000) return (rate / 1000000).toFixed(1) + 'M';
  if (rate >= 100000) return Math.round(rate / 1000) + 'k';
  if (rate >= 10000) return (rate / 1000).toFixed(1) + 'k';
  if (rate >= 1000) return String(Math.round(rate));
  return rate % 1 === 0 ? String(rate) : rate.toFixed(1);
}

function renderBinanceTicker() {
  const strip = document.getElementById('tickerStrip');
  if (!strip) return;
  
  const currencies = Object.keys(binanceRates);
  if (currencies.length === 0) return;
  
  const itemsHtml = currencies.map(cur => {
    const rate = binanceRates[cur];
    if (!rate) return '';
    
    // Binance rates are in USDT, show as crypto/USDT
    return `<span class="ti bnc">` +
      `<span class="tsrc">Binance</span>` +
      `<span class="tcur">${cur}</span>` +
      `<span class="tval">${rate.toFixed(2)}</span>` +
      `<span class="tunit">USDT</span>` +
      `</span><span class="tsep">·</span>`;
  }).join('');
  
  if (!itemsHtml.trim()) return;
  
  // Duplicate for seamless loop
  strip.innerHTML = itemsHtml + itemsHtml;
  
  // Calculate animation duration based on content length
  const totalChars = currencies.length * 20; // Approx chars per item
  const duration = Math.max(20, totalChars * 0.5);
  strip.style.animationDuration = `${duration}s`;
  document.documentElement.style.setProperty('--td', `${duration}s`);
}

// ═══════════════════════════════════════════════
//  Refresh
// ═══════════════════════════════════════════════
function setupRefresh() {
  const refreshLink = document.getElementById('refreshLink');
  const btnSettings = document.getElementById('btnSettings');
  
  if (refreshLink) {
    refreshLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await browser.runtime.sendMessage({ type: 'FETCH_NOW' });
      await loadRates();
    });
  }
  
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
  }
}
