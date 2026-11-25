
// ═══════════════════════════════════════════════
//  TASALO — Popup v2
//  Las tasas las pinta rates-view.js (barra de fuentes + tarjetas con gráfico + detalle, como la app y Android).
//  Aquí quedan el estado de la API, el ticker de Binance, actualizar y abrir opciones.
// ═══════════════════════════════════════════════

import { DEFAULT_SETTINGS, DEFAULT_TICKER_CURRENCIES, browser } from './constants.js';
import { applyAppearance } from './palettes.js';
import { mountRates } from './rates-view.js';

let settings = {};
let binanceRates = {};
let tickerOpen = false;
let listenersAttached = false;

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (listenersAttached) return;
  listenersAttached = true;

  const uiState = await browser.storage.local.get('popupUiState');
  tickerOpen = (uiState.popupUiState && uiState.popupUiState.tickerOpen) ?? false;

  await loadData();
  applyAppearance({ palette: settings.palette, theme: settings.colorBg });
  applyColors();
  renderTicker();
  applyTickerState();
  attachListeners();
  mountRates(document.getElementById('ratesSection'), { compact: true, respectSelection: true, onSourceChange: syncSourcePreference });
});

async function loadData() {
  const data = await browser.storage.local.get([
    'settings', 'binanceRates', 'lastUpdated', 'fetchError', 'eltoqueRates', 'bccRates', 'qvapayRates',
  ]);
  settings = data.settings ?? {};
  binanceRates = data.binanceRates ?? {};

  const hasRates = [data.eltoqueRates, data.bccRates, data.qvapayRates].some((r) => r && Object.keys(r).length > 0);
  const errorBanner = document.getElementById('errorBanner');
  const errorMsg = document.getElementById('errorMsg');
  if (data.fetchError) {
    setDot('error');
    if (errorBanner) errorBanner.style.display = 'flex';
    if (errorMsg) errorMsg.textContent = data.fetchError;
  } else {
    setDot(hasRates ? 'ok' : 'loading');
    if (errorBanner) errorBanner.style.display = 'none';
  }

  const updateInfo = document.getElementById('updateInfo');
  if (data.lastUpdated && updateInfo) updateInfo.textContent = fmtTime(data.lastUpdated);

  const iv = settings.updateInterval ?? 5;
  const footerInterval = document.getElementById('footerInterval');
  if (footerInterval) footerInterval.textContent = `cada ${iv < 60 ? iv + ' min' : (iv / 60).toFixed(1) + ' h'}`;
}

function setDot(state) {
  const dot = document.getElementById('updateDot');
  if (dot) dot.className = 'update-dot ' + state;
}

// El badge del icono y la rotación usan sourcePreference (solo El Toque o BCC): QvaPay no la cambia.
async function syncSourcePreference(source) {
  if (source !== 'eltoque' && source !== 'bcc') return;
  settings.sourcePreference = source;
  await browser.storage.local.set({ settings });
  await browser.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: { sourcePreference: source } });
}

// ── Ticker de Binance (solo DOM, sin innerHTML: igual que taso-extmf) ──
function renderTicker() {
  const strip = document.getElementById('tickerStrip');
  const section = document.getElementById('tickerSection');
  if (!strip) return;

  if (settings.tickerEnabled === false) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  const currencies = settings.tickerCurrencies?.length ? settings.tickerCurrencies : DEFAULT_TICKER_CURRENCIES;

  function showEmpty(msg) {
    strip.textContent = '';
    const s = document.createElement('span');
    s.style.cssText = 'padding:0 16px;font-size:9px;color:var(--text3);font-family:var(--mono)';
    s.textContent = msg;
    strip.appendChild(s);
  }

  if (Object.keys(binanceRates).length === 0) { showEmpty('Sin datos de Binance'); return; }

  const filtered = currencies.filter((cur) => binanceRates[cur] !== undefined);
  if (!filtered.length) { showEmpty('Sin datos'); return; }

  function item(cur, rate) {
    const wrap = document.createElement('span');
    wrap.className = 't-item bnc';
    for (const [cls, text] of [['t-cur', cur], ['t-val', rate.toFixed(2)], ['t-unit', 'USDT']]) {
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
    for (const cur of filtered) item(cur, binanceRates[cur]).forEach((el) => strip.appendChild(el));
  }

  // scrollSpeed 40 = velocidad base; mayor valor = ticker más rápido
  const speed = settings.scrollSpeed || 40;
  const baseDuration = Math.max(15, filtered.length * 0.4);
  const duration = Math.max(6, baseDuration * (40 / speed));
  strip.style.animationDuration = `${duration}s`;
  document.documentElement.style.setProperty('--ticker-dur', `${duration}s`);
}

function applyTickerState() {
  const body = document.getElementById('tickerBody');
  const chevron = document.getElementById('tickerChevron');
  if (body) body.classList.toggle('open', tickerOpen);
  if (chevron) chevron.classList.toggle('open', tickerOpen);
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

// Los colores sube/baja personalizados solo pisan la paleta si el usuario los cambió: con los de fábrica manda la paleta.
function applyColors() {
  const root = document.documentElement;
  if (settings.colorUp && settings.colorUp !== DEFAULT_SETTINGS.colorUp) root.style.setProperty('--up', settings.colorUp);
  if (settings.colorDown && settings.colorDown !== DEFAULT_SETTINGS.colorDown) root.style.setProperty('--down', settings.colorDown);
  if (settings.colorNeutral && settings.colorNeutral !== 'auto') root.style.setProperty('--neutral', settings.colorNeutral);
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
      setDot('loading');
      try {
        await browser.runtime.sendMessage({ type: 'FETCH_NOW' });
        await loadData();
        renderTicker();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        btnRefresh.classList.remove('spinning');
        btnRefresh.disabled = false;
      }
    });
  }

  if (btnSettings) btnSettings.addEventListener('click', () => browser.runtime.openOptionsPage());

  if (tickerToggle) {
    tickerToggle.addEventListener('click', () => {
      tickerOpen = !tickerOpen;
      applyTickerState();
      browser.storage.local.set({ popupUiState: { tickerOpen } });
    });
  }
}

const debouncedStorageUpdate = debounce(async (changes) => {
  if (changes.settings) {
    const next = changes.settings.newValue || {};
    applyAppearance({ palette: next.palette, theme: next.colorBg });
  }
  if (changes.settings || changes.binanceRates || changes.lastUpdated || changes.fetchError || changes.eltoqueRates || changes.bccRates || changes.qvapayRates) {
    await loadData();
    renderTicker();
  }
}, 100);

browser.storage.onChanged.addListener((changes) => debouncedStorageUpdate(changes));
