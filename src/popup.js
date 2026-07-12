// ═══════════════════════════════════════════════
//  TASALO — Popup v1
//  Muestra SOLO ElToque O BCC según configuración
// ═══════════════════════════════════════════════

import { PREFERRED_ORDER, CURRENCY_META, DEFAULT_TICKER_CURRENCIES, browser } from './constants.js';

let settings = {};
let currentRates = {};
let rateChanges = {};
let previousRates = {};
let binanceRates = {};
let tickerOpen = false;
let listenersAttached = false;

// ── Debounce utility ───────────────────────────
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
  applyTheme();
  applyColors();
  renderAll();
  attachListeners();
  renderSourceSwitch(); // Render source switch state
});

async function loadData() {
  const data = await browser.storage.local.get([
    'settings', 'currentRates', 'previousRates',
    'rateChanges', 'binanceRates', 'lastUpdated', 'fetchError',
    'eltoqueRates', 'bccRates', 'cadecaRates'
  ]);
  settings = data.settings ?? {};

  // FIX: antes, si la fuente elegida (ej. CADECA) no tenía datos válidos
  // todavía, este bloque caía silenciosamente a mostrar El Toque bajo la
  // etiqueta de la fuente elegida — pareciendo que "no cambiaba nada".
  // Ahora cada fuente muestra SOLO sus propios datos (o vacío si no hay).
  const pref = settings.sourcePreference || 'eltoque';
  currentRates = selectRatesForSource(pref, data);

  previousRates = data.previousRates ?? {};
  rateChanges = data.rateChanges ?? {};
  binanceRates = data.binanceRates ?? {};

  const errorBanner = document.getElementById('errorBanner');
  const errorMsg = document.getElementById('errorMsg');
  const loadingText = document.getElementById('ratesLoadingText');

  if (data.fetchError) {
    setDot('error');
    if (errorBanner) errorBanner.style.display = 'flex';
    if (errorMsg) errorMsg.textContent = data.fetchError;
  } else if (Object.keys(currentRates).length > 0) {
    setDot('ok');
    if (errorBanner) errorBanner.style.display = 'none';
  } else {
    setDot('loading');
    if (errorBanner) errorBanner.style.display = 'none';
  }

  if (loadingText) {
    if (!data.fetchError && Object.keys(currentRates).length === 0) {
      const sourceNames = { eltoque: 'El Toque', bcc: 'BCC', cadeca: 'CADECA' };
      loadingText.textContent = `Sin datos de ${sourceNames[pref] || pref} por ahora`;
    } else {
      loadingText.textContent = 'Obteniendo tasas...';
    }
  }

  const updateInfo = document.getElementById('updateInfo');
  if (data.lastUpdated && updateInfo) {
    updateInfo.textContent = fmtTime(data.lastUpdated);
  }

  const iv = settings.updateInterval ?? 5;
  const footerInterval = document.getElementById('footerInterval');
  if (footerInterval) {
    footerInterval.textContent =
      `cada ${iv < 60 ? iv + ' min' : (iv / 60).toFixed(1) + ' h'}`;
  }
}

// Selecciona las tasas de la fuente activa únicamente — sin mezclarlas
// ni sustituirlas silenciosamente por otra fuente cuando faltan datos.
function selectRatesForSource(pref, data) {
  if (pref === 'bcc')    return data.bccRates    || {};
  if (pref === 'cadeca') return data.cadecaRates || {};
  if (pref === 'eltoque') return data.eltoqueRates || {};
  return data.currentRates || {};
}

function setDot(state) {
  const dot = document.getElementById('updateDot');
  if (dot) dot.className = 'update-dot ' + state;
}

// ── Render principal ──────────────────────────
function renderAll() {
  const hasRates = Object.keys(currentRates).length > 0;
  const ratesLoading = document.getElementById('ratesLoading');
  const ratesGrid = document.getElementById('ratesGrid');

  if (ratesLoading) ratesLoading.style.display = hasRates ? 'none' : 'flex';
  if (ratesGrid) ratesGrid.style.display = hasRates ? 'grid' : 'none';

  if (hasRates) {
    renderGrid();
  }

  // El ticker de Binance es independiente de si la fuente elegida
  // (ElToque/BCC/CADECA) tiene datos — siempre se intenta renderizar.
  renderTicker();

  applyTickerState();
}

// ── Obtener fuente seleccionada (ElToque O BCC) ───────────────────────────
function getSourcePreference() {
  // Por defecto: ElToque
  return settings.sourcePreference || 'eltoque';
}

// ── Render Source Switch ─────────────────────────────────
function renderSourceSwitch() {
  const currentSource = getSourcePreference();
  const sourceBtns = document.querySelectorAll('.source-btn');
  
  sourceBtns.forEach(btn => {
    const source = btn.dataset.source;
    if (source === currentSource) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update footer text based on source
  const footerSource = document.querySelector('.footer-source');
  if (footerSource) {
    const sourceNames = {
      'eltoque': 'El Toque (Informal)',
      'bcc': 'BCC (Oficial)',
      'cadeca': 'CADECA'
    };
    const sourceName = sourceNames[currentSource] || 'El Toque (Informal)';
    footerSource.innerHTML = `<span class="footer-dot"></span>TASALO — Tasas de ${sourceName}`;
  }
}

// ── Handle Source Switch ─────────────────────────────────
async function handleSourceSwitch(newSource) {
  const currentSource = getSourcePreference();
  if (newSource === currentSource) return;
  
  // Update settings
  settings.sourcePreference = newSource;
  await browser.storage.local.set({ settings });
  
  // Notify background script
  await browser.runtime.sendMessage({ 
    type: 'UPDATE_SETTINGS', 
    settings: { sourcePreference: newSource } 
  });
  
  // Re-render
  renderSourceSwitch();
  await loadData();
  renderAll();
}

// ── Obtener monedas de la fuente seleccionada ───────────────────────────
// FIX B5: antes esto devolvía arrays fijos por fuente, ignorando qué
// monedas había seleccionado el usuario en Opciones si no estaban en la
// lista hardcodeada. Ahora se derivan directamente de las tasas reales
// que ya cargó loadData() para la fuente activa (currentRates).
function getSourceCurrencies() {
  return Object.keys(currentRates);
}

// ── Ordenar monedas ───────────────────────────
function getSortedCurrencies() {
  const sourceCurrencies = getSourceCurrencies();
  const order = settings.currencyOrder?.length ? settings.currencyOrder : PREFERRED_ORDER;
  const selected = settings.selectedCurrencies ?? [];
  
  // Filtrar solo las monedas de la fuente seleccionada
  const filtered = sourceCurrencies.filter(cur => 
    Object.keys(currentRates).includes(cur)
  );
  
  const sorted = [...filtered].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  
  return selected.length > 0 ? sorted.filter(c => selected.includes(c)) : sorted;
}

// ── Grid de tarjetas ──────────────────────────
function renderGrid() {
  const grid = document.getElementById('ratesGrid');
  if (!grid) return;

  const currencies = getSortedCurrencies();
  const showFlags = settings.showCurrencyFlag !== false;
  const fontSize = settings.fontSize ?? 13;
  const isCadeca = getSourcePreference() === 'cadeca';

  const cols = currencies.length <= 2 ? 'cols-2' : '';
  grid.className = 'rates-grid ' + cols;
  grid.innerHTML = '';

  for (const cur of currencies) {
    const val = currentRates[cur];
    if (val === undefined) continue;
    const change = rateChanges[cur] ?? 'neutral';
    const meta = CURRENCY_META[cur] ?? { name: cur, flag: '💱' };
    const arrow = change === 'up' ? '▲' : change === 'down' ? '▼' : '—';

    const card = document.createElement('div');
    card.className = `rate-card ${change}`;

    let valueHtml, subLabel, diffHtml, valFontSize;

    if (isCadeca && val && typeof val === 'object') {
      // FIX: CADECA son precios reales de compra y venta, no una tasa
      // única — mostrar el rango en vez de inventar un solo número.
      const buy = val.buy;
      const sell = val.sell;
      if (buy != null && sell != null && buy !== sell) {
        valueHtml = `${fmtRate(buy)}–${fmtRate(sell)}`;
      } else {
        valueHtml = fmtRate(sell ?? buy ?? 0);
      }
      subLabel = 'Compra–Venta';
      diffHtml = '';
      valFontSize = fontSize + 1;
      card.title = `${meta.name} · Compra ${buy != null ? fmtRate(buy) : '—'} / Venta ${sell != null ? fmtRate(sell) : '—'} CUP`;
    } else {
      const numVal = typeof val === 'number' ? val : (val && typeof val.rate === 'number' ? val.rate : 0);
      const prev = previousRates[cur];
      const diff = typeof prev === 'number' ? numVal - prev : null;
      valueHtml = fmtRate(numVal);
      subLabel = meta.name;
      diffHtml = diff !== null && diff !== 0 ? (diff > 0 ? '+' : '') + diff.toFixed(1) : '';
      valFontSize = fontSize + 4;
      card.title = `${meta.name} · ${cur} en pesos cubanos`;
    }

    card.innerHTML = `
      <div class="rate-top">
        <span class="rate-cur">${cur}</span>
        ${showFlags ? `<span class="rate-flag">${meta.flag}</span>` : ''}
      </div>
      <div class="rate-val" style="font-size:${valFontSize}px">${valueHtml}</div>
      <div class="rate-bot">
        <span class="rate-name">${subLabel}</span>
        <span class="rate-diff">${arrow}${diffHtml}</span>
      </div>
    `;
    grid.appendChild(card);
  }
}

// ── Ticker de Binance ────────────────────────────────────
function renderTicker() {
  const strip = document.getElementById('tickerStrip');
  const section = document.getElementById('tickerSection');
  if (!strip) return;

  // Toggle general del ticker (gestión desde Opciones > Ticker)
  if (settings.tickerEnabled === false) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  // Usar monedas configuradas o default
  const currencies = settings.tickerCurrencies?.length ? settings.tickerCurrencies : DEFAULT_TICKER_CURRENCIES;

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

  // Duplicate for seamless loop
  strip.innerHTML = itemsHtml + itemsHtml;

  // Calculate animation duration, escalado por settings.scrollSpeed
  // (40 = velocidad base/default; mayor valor = ticker más rápido)
  const speed = settings.scrollSpeed || 40;
  const baseDuration = Math.max(15, currencies.length * 0.4);
  const duration = Math.max(6, baseDuration * (40 / speed));
  strip.style.animationDuration = `${duration}s`;
  document.documentElement.style.setProperty('--ticker-dur', `${duration}s`);
}

// ── Toggle ticker ─────────────────────────────
function applyTickerState() {
  const body = document.getElementById('tickerBody');
  const chevron = document.getElementById('tickerChevron');
  if (body) body.classList.toggle('open', tickerOpen);
  if (chevron) chevron.classList.toggle('open', tickerOpen);
}

// ── Utilidades ────────────────────────────────
function fmtRate(val) {
  if (val >= 10000) return val.toLocaleString('es-CU', { maximumFractionDigits: 0 });
  if (val >= 1000) return val.toLocaleString('es-CU', { maximumFractionDigits: 0 });
  return val.toFixed(val % 1 === 0 ? 0 : 1);
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function applyTheme() {
  const t = settings.colorBg;
  if (t === 'dark') document.body.classList.add('theme-dark');
  if (t === 'light') document.body.classList.add('theme-light');
}

function applyColors() {
  const root = document.documentElement;
  if (settings.colorUp) root.style.setProperty('--up', settings.colorUp);
  if (settings.colorDown) root.style.setProperty('--down', settings.colorDown);
  if (settings.colorNeutral && settings.colorNeutral !== 'auto')
    root.style.setProperty('--neutral', settings.colorNeutral);
}

// ── Listeners ─────────────────────────────────
function attachListeners() {
  // Source Switch
  const sourceSwitch = document.getElementById('sourceSwitch');
  if (sourceSwitch) {
    sourceSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('.source-btn');
      if (btn && btn.dataset.source) {
        handleSourceSwitch(btn.dataset.source);
      }
    });
  }

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

        // Recargar datos incluyendo las tasas por fuente
        const data = await browser.storage.local.get([
          'currentRates', 'rateChanges', 'binanceRates', 
          'lastUpdated', 'fetchError', 'eltoqueRates', 'bccRates', 'cadecaRates'
        ]);

        const pref = settings.sourcePreference || 'eltoque';
        currentRates = selectRatesForSource(pref, data);

        rateChanges = data.rateChanges || {};
        binanceRates = data.binanceRates || {};

        renderAll();
      } catch (error) {
        console.error('Refresh error:', error);
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
      applyTickerState();
      browser.storage.local.set({ popupUiState: { tickerOpen } });
    });
  }
}

const debouncedStorageUpdate = debounce(async (changes) => {
  if (changes.currentRates || changes.rateChanges || changes.binanceRates || changes.lastUpdated || changes.fetchError || changes.eltoqueRates || changes.bccRates || changes.cadecaRates) {
    if (changes.eltoqueRates || changes.bccRates || changes.cadecaRates) {
      // Re-evaluate source preference when source-specific rates change
      await loadData();
    } else {
      if (changes.currentRates) currentRates = changes.currentRates.newValue || {};
      if (changes.rateChanges) rateChanges = changes.rateChanges.newValue || {};
      if (changes.binanceRates) binanceRates = changes.binanceRates.newValue || {};
    }
    await loadData();
    renderAll();
  }
}, 100);

browser.storage.onChanged.addListener((changes) => {
  debouncedStorageUpdate(changes);
});
