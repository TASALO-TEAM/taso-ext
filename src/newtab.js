// ═══════════════════════════════════════════════
//  TASALO — New Tab Page v1
//  Liquid Glass con tres paneles (ElToque + BCC + QvaPay)
// ═══════════════════════════════════════════════

import { DEFAULT_TICKER_CURRENCIES, browser } from './constants.js';
import { applyAppearance } from './palettes.js';
import { mountRates } from './rates-view.js';

// Estado global
let binanceRates = {};
let settings = {};

// ═══════════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  // Nueva pestaña desactivada: newtab-init.js ya la está cambiando por la nativa del navegador; no se monta nada.
  if (settings.newTabEnabled === false) return;
  setupTheme();
  setupClock();
  await setupYearProgress();
  setFooterVersion();
  mountRates(document.getElementById('ratesRoot'), { segHost: document.getElementById('srcHost') });
  await loadRates();
  setupRefresh();
  
  // Escuchar cambios en storage
  browser.storage.onChanged.addListener((changes) => {
    if (changes.binanceRates) {
      loadRates();
    }
    if (changes.yearState) {
      setupYearProgress();
    }
    if (changes.settings) {
      settings = changes.settings.newValue || {};
      applyAppearance({ palette: settings.palette, theme: settings.colorBg });
      syncThemeButtons();
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

function syncThemeButtons() {
  const active = settings.colorBg || 'auto';
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === active));
}

function setupTheme() {
  applyAppearance({ palette: settings.palette, theme: settings.colorBg });
  syncThemeButtons();

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.colorBg = btn.dataset.theme;
      applyAppearance({ theme: settings.colorBg });
      syncThemeButtons();
      browser.storage.local.set({ settings });
    });
  });
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
    const small = document.createElement('small');
    small.textContent = 'completado';
    pctEl.replaceChildren(document.createTextNode(`${percent.toFixed(1)}% `), small);
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
//  Tasas: las pinta rates-view.js (barra de fuentes + tarjetas con gráfico + detalle). Aquí solo el ticker.
// ═══════════════════════════════════════════════
async function loadRates() {
  try {
    const data = await browser.storage.local.get('binanceRates');
    binanceRates = data.binanceRates || {};
    renderBinanceTicker();
  } catch (error) {
    console.error('Error loading rates:', error);
  }
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
  
  function makeItem(cur, rate) {
    const wrap = document.createElement('span');
    wrap.className = 'ti bnc';
    for (const [cls, text] of [['tsrc', 'Binance'], ['tcur', cur], ['tval', rate.toFixed(2)], ['tunit', 'USDT']]) {
      const el = document.createElement('span');
      el.className = cls;
      el.textContent = text;
      wrap.appendChild(el);
    }
    const sep = document.createElement('span');
    sep.className = 'tsep';
    sep.textContent = '·';
    return [wrap, sep];
  }

  strip.textContent = '';
  for (let pass = 0; pass < 2; pass++) { // duplicado para el bucle continuo
    for (const cur of currencies) {
      if (!binanceRates[cur]) continue; // igual que antes: sin tasa válida no se pinta
      makeItem(cur, binanceRates[cur]).forEach((el) => strip.appendChild(el));
    }
  }
  
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
