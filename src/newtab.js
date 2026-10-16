// ═══════════════════════════════════════════════
//  TASALO — New Tab Page v1
//  Liquid Glass con tres paneles (ElToque + BCC + QvaPay)
// ═══════════════════════════════════════════════

import { PREFERRED_ORDER, CURRENCY_META, PRODUCTION_API_URL, DEFAULT_TICKER_CURRENCIES, flagImgHtml, attachFlagFallbacks, browser } from './constants.js';

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
    if (changes.currentRates || changes.rateChanges || changes.eltoqueRates || changes.bccRates || changes.qvapayRates) {
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
      'qvapayRates'
    ]);

    // Use source-specific rates for each panel
    currentRates = data.currentRates || {};
    rateChanges = data.rateChanges || {};
    binanceRates = data.binanceRates || {};

    renderElToquePanel(data.eltoqueRates || {});
    renderBccPanel(data.bccRates || {});
    renderQvapayPanel(data.qvapayRates || {});
    renderBinanceTicker();

  } catch (error) {
    console.error('Error loading rates:', error);
  }
}

// Orden de códigos: primero los conocidos según `order` y después el resto
// (monedas o métodos nuevos que añada la API) por orden alfabético, para que
// todo lo que traiga la fuente se muestre aunque la extensión no lo conozca.
function sortCodes(codes, order) {
  return [...codes].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function setPanelTime(id) {
  const updEl = document.getElementById(id);
  if (updEl) {
    updEl.textContent = new Date().toLocaleTimeString('es-CU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function showPanelEmpty(grid, text) {
  grid.innerHTML = '';
  const msg = document.createElement('div');
  msg.className = 'pnl-empty';
  msg.textContent = text;
  grid.appendChild(msg);
}

// Panel de una fuente con una tasa por moneda (ElToque, BCC): muestra TODAS
// las monedas que traiga la fuente. "CUP" es la moneda base, no una tarjeta.
function renderCurrencyPanel(gridId, updId, sourceRates, emptyText) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const codes = sortCodes(
    Object.keys(sourceRates).filter(code => code !== 'CUP' && typeof sourceRates[code] === 'number'),
    PREFERRED_ORDER
  );

  grid.innerHTML = '';

  if (!codes.length) {
    showPanelEmpty(grid, emptyText);
  } else {
    for (const currency of codes) {
      const change = rateChanges[currency] || 'neutral';
      const meta = CURRENCY_META[currency] || { name: currency, flag: '💱' };
      grid.appendChild(createRateCard(currency, sourceRates[currency], change, meta, 'CUP'));
    }
    attachFlagFallbacks(grid);
  }

  setPanelTime(updId);
}

function renderElToquePanel(eltoqueRates) {
  renderCurrencyPanel('eltoqueGrid', 'eltoqueUpd', eltoqueRates, 'Sin datos de El Toque por ahora');
}

function renderBccPanel(bccRates) {
  renderCurrencyPanel('bccGrid', 'bccUpd', bccRates, 'Sin datos del BCC por ahora');
}

// ═══════════════════════════════════════════════
//  QvaPay P2P (guardado por background.js desde /tasas/latest → qvapay)
//  Las claves son MÉTODOS DE PAGO, no monedas: cada valor es cuánto de ese
//  método se obtiene por 1 USD de QvaPay. Se muestran TODOS los que traiga
//  la API (los que no tienen operaciones recientes no vienen).
// ═══════════════════════════════════════════════
const QVAPAY_ORDER = ['CUP', 'MLC', 'TROPIPAY', 'ETECSA', 'ZELLE', 'CLASICA', 'BOLSATM', 'BANDECPREPAGO', 'SBERBANK'];
const QVAPAY_META = {
  CUP:           { name: 'Banco CUP',      short: 'CUP',    icon: '🏦' },
  MLC:           { name: 'Banco MLC',      short: 'MLC',    icon: '💳' },
  TROPIPAY:      { name: 'Tropipay',       short: 'TPAY',   icon: '💸' },
  ETECSA:        { name: 'Saldo ETECSA',   short: 'ETECSA', icon: '📱' },
  ZELLE:         { name: 'Zelle',          short: 'ZELLE',  icon: '⚡' },
  CLASICA:       { name: 'Tarjeta Clásica', short: 'CLÁS',  icon: '💳' },
  BOLSATM:       { name: 'Bolsa TM',       short: 'BOLSA',  icon: '👛' },
  BANDECPREPAGO: { name: 'Bandec Prepago', short: 'BPREP',  icon: '💳' },
  SBERBANK:      { name: 'Sberbank',       short: 'SBER',   icon: '🏦' },
};

function renderQvapayPanel(qvapayRates) {
  const grid = document.getElementById('qvapayGrid');
  if (!grid) return;

  const codes = sortCodes(
    Object.keys(qvapayRates).filter(code => qvapayRates[code] && typeof qvapayRates[code].rate === 'number'),
    QVAPAY_ORDER
  );

  grid.innerHTML = '';

  if (!codes.length) {
    showPanelEmpty(grid, 'Sin datos de QvaPay por ahora');
  } else {
    for (const code of codes) {
      const meta = QVAPAY_META[code] || { name: code, short: code, icon: '💱' };
      grid.appendChild(createQvapayCard(qvapayRates[code], meta));
    }
  }

  setPanelTime('qvapayUpd');
}

// Los valores de QvaPay pueden ser < 10 (Zelle ≈ 1.04, Tropipay ≈ 0.91):
// con formatRate saldrían como "1.0", así que ahí se usan 2 decimales.
function formatQv(value) {
  return value < 10 ? value.toFixed(2) : formatRate(value);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function createQvapayCard(info, meta) {
  const change = info.change || 'neutral';
  const card = document.createElement('div');
  card.className = `rcard ${change}`;

  const arrow = change === 'up' ? '▲' : change === 'down' ? '▼' : '—';
  const arrowLabel = change === 'up' ? 'Sube' : change === 'down' ? 'Baja' : 'Sin cambio';
  const valueText = formatQv(info.rate);
  const sizeClass = getSizeClassForLength(valueText.length);

  // Compra / venta: dos trozos que no se parten por dentro; si no caben en la
  // misma línea, la venta baja a la siguiente (mejor que cortar con "…").
  const sides = [];
  if (typeof info.buy === 'number') sides.push(`<span>C ${formatQv(info.buy)}</span>`);
  if (typeof info.sell === 'number') sides.push(`<span>V ${formatQv(info.sell)}</span>`);
  const bsLine = sides.length
    ? `<div class="rcard-bs" role="group" aria-label="Compra y venta">${sides.join('')}</div>`
    : '';

  card.title = meta.name;
  card.innerHTML = `
    <div class="rcard-top">
      <span class="rcard-sym">${escapeHtml(meta.short)}</span>
      <span class="rcard-ico" aria-hidden="true">${escapeHtml(meta.icon)}</span>
    </div>
    <div class="rcard-val ${sizeClass}">${valueText}</div>
    <div class="rcard-unit">por 1 USD</div>
    ${bsLine}
    <div class="rcard-bot">
      <span class="rcard-name">${escapeHtml(meta.name)}</span>
      <span class="rcard-pct" role="img" aria-label="${arrowLabel}">${arrow}</span>
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
      <span class="rcard-ico">${flagImgHtml(meta.flag, 15)}</span>
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
  if (len >= 13) return 'sz7';
  if (len >= 11) return 'sz6';
  if (len >= 9) return 'sz5';
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
