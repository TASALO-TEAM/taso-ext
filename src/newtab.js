// ═══════════════════════════════════════════════
//  TASALO — New Tab Page v1
//  Liquid Glass con dos paneles (ElToque + BCC)
// ═══════════════════════════════════════════════

import { PREFERRED_ORDER, CURRENCY_META, PRODUCTION_API_URL, DEFAULT_TICKER_CURRENCIES, browser } from './constants.js';

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
  await setupYearProgress();
  setFooterVersion();
  await loadRates();
  setupRefresh();
  
  // Escuchar cambios en storage
  browser.storage.onChanged.addListener((changes) => {
    if (changes.currentRates || changes.rateChanges || changes.fuelRates) {
      loadRates();
    }
    if (changes.yearState) {
      setupYearProgress();
    }
    if (changes.settings) {
      settings = changes.settings.newValue || {};
      renderBinanceTicker();
    }
  });
});

async function loadSettings() {
  const data = await browser.storage.local.get('settings');
  settings = data.settings || {};
}

function setFooterVersion() {
  const el = document.getElementById('footVersion');
  if (!el) return;
  try {
    el.textContent = 'v' + browser.runtime.getManifest().version;
  } catch {
    el.textContent = '';
  }
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
// ═══════════════════════════════════════════════
//  Year Progress
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════════
//  Year Progress + Frase del día (M1: usa GET /api/v1/year/state
//  cacheado por background.js; si no hay datos o falla, cae al
//  cálculo local que ya existía, sin frase).
// ═══════════════════════════════════════════════════
async function setupYearProgress() {
  const now = new Date();
  const year = now.getFullYear();

  // Días transcurridos: siempre se calcula localmente (es determinista,
  // no depende de la API). percent y daysRemaining sí vienen de la API
  // cuando está disponible, para que coincidan exactamente con /y del bot.
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const totalMs = yearEnd - yearStart;
  const elapsedMs = now - yearStart;
  const daysPassed = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  let percent = (elapsedMs / totalMs) * 100;
  let daysRemaining = 365 - daysPassed;
  let quoteText = null;

  try {
    const data = await browser.storage.local.get('yearState');
    const state = data.yearState;
    if (state && state.ok && state.progress) {
      if (typeof state.progress.percent === 'number') percent = state.progress.percent;
      if (typeof state.progress.days_left === 'number') daysRemaining = state.progress.days_left;
      if (state.quote && state.quote.quote) quoteText = state.quote.quote;
    }
  } catch {
    // sin storage disponible — nos quedamos con el cálculo local
  }

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
      progressEl.style.width = `${percent.toFixed(1)}%`;
    }, 100);
  }

  if (pctEl) {
    pctEl.innerHTML = `${percent.toFixed(1)}% <small>completado</small>`;
  }

  if (daysPassedEl) daysPassedEl.textContent = daysPassed;
  if (daysRemainingEl) daysRemainingEl.textContent = daysRemaining;
  if (weeksLeftEl) weeksLeftEl.textContent = weeksLeft;

  // Highlight current month
  const currentMonth = now.getMonth();

  mticks.forEach((tick, index) => {
    tick.classList.remove('past', 'now');
    if (index < currentMonth) {
      tick.classList.add('past');
    } else if (index === currentMonth) {
      tick.classList.add('now');
    }
  });

  // Frase del día
  const quoteBlock = document.getElementById('ywQuote');
  const quoteTextEl = document.getElementById('ywQuoteText');
  if (quoteBlock && quoteTextEl) {
    if (quoteText) {
      quoteTextEl.textContent = quoteText;
      quoteBlock.style.display = 'flex';
    } else {
      quoteBlock.style.display = 'none';
    }
  }
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
      'lastUpdated',
      'eltoqueRates',
      'bccRates',
      'cadecaRates',
      'fuelRates'
    ]);

    // Use source-specific rates for each panel
    currentRates = data.currentRates || {};
    rateChanges = data.rateChanges || {};
    binanceRates = data.binanceRates || {};

    // Store source-specific rates
    const eltoqueRates = data.eltoqueRates || {};
    const bccRates = data.bccRates || {};

    renderElToquePanel(eltoqueRates);
    renderBccPanel(bccRates);
    renderFuelPanel(data.fuelRates || null);
    renderBinanceTicker();

  } catch (error) {
    console.error('Error loading rates:', error);
  }
}

function renderElToquePanel(eltoqueRates) {
  const grid = document.getElementById('eltoqueGrid');
  if (!grid) return;

  // ElToque currencies (informal market)
  const eltoqueCurrencies = ['EUR', 'USD', 'MLC', 'BTC', 'TRX', 'USDT'];

  grid.innerHTML = '';

  for (const currency of eltoqueCurrencies) {
    const rate = eltoqueRates[currency];
    if (rate === undefined) continue;

    const change = rateChanges[currency] || 'neutral';
    const meta = CURRENCY_META[currency] || { name: currency, flag: '💱' };

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

function renderBccPanel(bccRates) {
  const grid = document.getElementById('bccGrid');
  if (!grid) return;

  // BCC currencies (official market)
  const bccCurrencies = ['EUR', 'USD', 'CAD', 'GBP', 'CHF', 'MXN'];

  grid.innerHTML = '';

  for (const currency of bccCurrencies) {
    const rate = bccRates[currency];
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

// M2: Combustible (GET /api/v1/tasas/fuel, cacheado por background.js)
const FUEL_META = {
  'B-94':     { name: 'Gasolina B-94', flag: '⛽', short: 'B94' },
  'B-90':     { name: 'Gasolina B-90', flag: '⛽', short: 'B90' },
  'B-83':     { name: 'Gasolina B-83', flag: '⛽', short: 'B83' },
  'Petroleo': { name: 'Petróleo/Diésel', flag: '🛢️', short: 'GO' },
  'Gas_LP':   { name: 'Gas Licuado (LP)', flag: '🔥', short: 'GLP' },
};
const FUEL_ORDER = ['B-94', 'B-90', 'B-83', 'Petroleo', 'Gas_LP'];

function renderFuelPanel(fuelData) {
  const grid = document.getElementById('fuelGrid');
  if (!grid) return;

  const rates = (fuelData && fuelData.rates) || {};
  grid.innerHTML = '';

  for (const key of FUEL_ORDER) {
    const item = rates[key];
    if (!item) continue;

    const buy = typeof item.buy === 'number' ? item.buy : null;
    const sell = typeof item.sell === 'number' ? item.sell : null;
    if (buy === null && sell === null) continue;

    const meta = FUEL_META[key] || { name: key, flag: '⛽', short: key };
    const change = item.change || 'neutral';
    const unit = item.unit || 'CUP/L';

    const card = createFuelCard(meta.short, buy, sell, change, meta, unit);
    grid.appendChild(card);
  }

  if (!grid.children.length) {
    grid.innerHTML = '<div class="skel" style="height:80px"></div><div class="skel" style="height:80px"></div><div class="skel" style="height:80px"></div>';
  }

  const updEl = document.getElementById('fuelUpd');
  if (updEl) {
    updEl.textContent = new Date().toLocaleTimeString('es-CU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// El combustible se cotiza como un RANGO de precios (mínimo-máximo
// observado en el mercado informal), no como una tasa única. Se muestra
// tal cual para ser fiel a la realidad.
function createFuelCard(label, buy, sell, change, meta, unit) {
  const card = document.createElement('div');
  card.className = `rcard ${change}`;

  const arrow = change === 'up' ? '▲' : change === 'down' ? '▼' : '—';

  let valueText;
  if (buy != null && sell != null && buy !== sell) {
    valueText = `${formatRate(buy)}–${formatRate(sell)}`;
  } else {
    valueText = formatRate(sell ?? buy);
  }

  const sizeClass = getSizeClassForLength(valueText.length);

  card.innerHTML = `
    <div class="rcard-top">
      <span class="rcard-sym">${label}</span>
      <span class="rcard-ico">${meta.flag}</span>
    </div>
    <div class="rcard-val ${sizeClass}">${valueText}</div>
    <div class="rcard-unit">${unit}</div>
    <div class="rcard-bot">
      <span class="rcard-name">${meta.name}</span>
      <span class="rcard-pct">${arrow}</span>
    </div>
  `;

  return card;
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
  return getSizeClassForLength(len);
}

function getSizeClassForLength(len) {
  if (len >= 10) return 'sz8';
  if (len >= 8) return 'sz7';
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
  const zone = document.getElementById('tickerZone');
  if (!strip) return;

  // Toggle general del ticker (gestión desde Opciones > Ticker)
  if (settings.tickerEnabled === false) {
    if (zone) zone.style.display = 'none';
    return;
  }
  if (zone) zone.style.display = '';

  const selected = settings.tickerCurrencies?.length ? settings.tickerCurrencies : DEFAULT_TICKER_CURRENCIES;
  const currencies = selected.filter(cur => binanceRates[cur] !== undefined);
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
  
  // Calculate animation duration, escalado por settings.scrollSpeed
  // (40 = velocidad base/default; mayor valor = ticker más rápido)
  const speed = settings.scrollSpeed || 40;
  const totalChars = currencies.length * 20;
  const baseDuration = Math.max(20, totalChars * 0.5);
  const duration = Math.max(8, baseDuration * (40 / speed));
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
