// ═══════════════════════════════════════════════
//  TASALO — Options Page v1
//  Configuración simple y plug & play
// ═══════════════════════════════════════════════

import { DEFAULT_SETTINGS, CURRENCY_META, PREFERRED_ORDER, DEFAULT_TICKER_CURRENCIES, TICKER_CURRENCY_META, browser } from './constants.js';

let settings = {};
let availableCurrencies = [];
let availableTickerCurrencies = [];

// ═══════════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupNavigation();
  setupFormListeners();
  renderCurrenciesList();
  renderTickerCurrenciesList();
  updateRangeValues();
  applyTheme(settings.colorBg || 'auto');
  setAboutVersion();
});

// ═══════════════════════════════════════════════════
//  Theme (B2 fix: la página de Options ahora sí aplica su propio tema)
// ═══════════════════════════════════════════════════
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else if (theme === 'dark') {
    root.classList.remove('light');
  } else {
    // auto: sigue la preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('light', !prefersDark);
  }
}

function setAboutVersion() {
  const el = document.getElementById('aboutVersion');
  if (!el) return;
  try {
    el.textContent = browser.runtime.getManifest().version;
  } catch {
    el.textContent = '—';
  }
}

async function loadSettings() {
  const data = await browser.storage.local.get('settings');
  settings = { ...DEFAULT_SETTINGS, ...data.settings };
  
  // Cargar valores en el formulario
  loadFormValues();
}

function loadFormValues() {
  // General
  document.getElementById('updateInterval').value = settings.updateInterval || 5;
  document.getElementById('iconRotateEnabled').checked = settings.iconRotateEnabled !== false;
  document.getElementById('iconRotateInterval').value = settings.iconRotateInterval || 2;
  
  // Theme
  const theme = settings.colorBg || 'auto';
  document.querySelectorAll('#themeGroup .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === theme);
  });

  // Fuente de datos preferida
  const source = settings.sourcePreference || 'eltoque';
  document.querySelectorAll('#sourceGroup .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === source);
  });

  document.getElementById('newTabEnabled').checked = settings.newTabEnabled !== false;
  document.getElementById('omniboxEnabled').checked = settings.omniboxEnabled !== false;

  // Ticker
  document.getElementById('tickerEnabled').checked = settings.tickerEnabled !== false;

  // Display
  document.getElementById('fontSize').value = settings.fontSize || 13;
  document.getElementById('scrollSpeed').value = settings.scrollSpeed || 40;
  document.getElementById('showCurrencyFlag').checked = settings.showCurrencyFlag !== false;
  document.getElementById('showTimestamp').checked = settings.showTimestamp !== false;
  document.getElementById('compactMode').checked = settings.compactMode || false;
  document.getElementById('colorUp').value = settings.colorUp || '#ff6b6b';
  document.getElementById('colorDown').value = settings.colorDown || '#4ade80';
}

// ═══════════════════════════════════════════════
//  Navigation
// ═══════════════════════════════════════════════
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Update active section
      const sectionId = item.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${sectionId}`).classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════════
//  Form Listeners
// ═══════════════════════════════════════════════
function setupFormListeners() {
  // Range inputs
  document.querySelectorAll('.range').forEach(range => {
    range.addEventListener('input', updateRangeValues);
  });
  
  // Theme buttons
  document.querySelectorAll('#themeGroup .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#themeGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme(btn.dataset.val); // preview en vivo (fix B2)
    });
  });

  // Fuente de datos preferida
  document.querySelectorAll('#sourceGroup .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sourceGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Save button
  document.getElementById('btnSave').addEventListener('click', saveSettings);
  
  // Reset button
  document.getElementById('btnReset').addEventListener('click', resetSettings);
  
  // Select all/none currencies
  document.getElementById('btnSelectAll')?.addEventListener('click', () => selectAllCurrencies(true));
  document.getElementById('btnSelectNone')?.addEventListener('click', () => selectAllCurrencies(false));

  document.getElementById('btnTickerSelectAll')?.addEventListener('click', () => selectAllTickerCurrencies(true));
  document.getElementById('btnTickerSelectNone')?.addEventListener('click', () => selectAllTickerCurrencies(false));
}

function updateRangeValues() {
  const interval = document.getElementById('updateInterval').value;
  document.getElementById('updateIntervalVal').textContent = 
    interval < 60 ? `${interval} min` : `${(interval / 60).toFixed(1)} h`;
  
  const rotateInterval = document.getElementById('iconRotateInterval').value;
  document.getElementById('iconRotateIntervalVal').textContent = `${rotateInterval} seg`;
  
  const fontSize = document.getElementById('fontSize').value;
  document.getElementById('fontSizeVal').textContent = `${fontSize} px`;

  const scrollSpeed = document.getElementById('scrollSpeed').value;
  document.getElementById('scrollSpeedVal').textContent = scrollSpeed;
}

// ═══════════════════════════════════════════════
//  Currencies List
// ═══════════════════════════════════════════════
async function renderCurrenciesList() {
  const container = document.getElementById('currenciesList');
  if (!container) return;
  
  // Get available currencies from storage (loaded rates)
  const data = await browser.storage.local.get('currentRates');
  const loadedCurrencies = Object.keys(data.currentRates || {});
  
  // Use predefined list if no rates loaded
  availableCurrencies = loadedCurrencies.length > 0 ? loadedCurrencies : PREFERRED_ORDER;
  
  const selected = settings.selectedCurrencies || [];
  
  container.innerHTML = availableCurrencies.map(currency => {
    const meta = CURRENCY_META[currency] || { name: currency, flag: '💱' };
    const isSelected = selected.length === 0 || selected.includes(currency);
    
    return `
      <div class="currency-item ${isSelected ? 'selected' : ''}" data-currency="${currency}">
        <div class="currency-left">
          <span class="currency-flag">${meta.flag}</span>
          <div>
            <div class="currency-code">${currency}</div>
            <div class="currency-name">${meta.name}</div>
          </div>
        </div>
        <input type="checkbox" class="currency-checkbox" ${isSelected ? 'checked' : ''}>
      </div>
    `;
  }).join('');
  
  // Add click listeners
  container.querySelectorAll('.currency-item').forEach(item => {
    item.addEventListener('click', () => {
      const checkbox = item.querySelector('.currency-checkbox');
      checkbox.checked = !checkbox.checked;
      item.classList.toggle('selected', checkbox.checked);
    });
  });
}

function getSelectedCurrencies() {
  const checkboxes = document.querySelectorAll('.currency-checkbox');
  const selected = [];
  
  checkboxes.forEach((cb, index) => {
    if (cb.checked) {
      selected.push(availableCurrencies[index]);
    }
  });
  
  return selected;
}

function selectAllCurrencies(select) {
  document.querySelectorAll('.currency-item').forEach(item => {
    const checkbox = item.querySelector('.currency-checkbox');
    checkbox.checked = select;
    item.classList.toggle('selected', select);
  });
}

// Ticker Currencies List (qué criptomonedas se muestran en la cinta)
function renderTickerCurrenciesList() {
  const container = document.getElementById('tickerCurrenciesList');
  if (!container) return;

  availableTickerCurrencies = [...DEFAULT_TICKER_CURRENCIES];
  const selected = settings.tickerCurrencies?.length ? settings.tickerCurrencies : availableTickerCurrencies;

  container.innerHTML = availableTickerCurrencies.map(currency => {
    const meta = TICKER_CURRENCY_META[currency] || { name: currency };
    const isSelected = selected.includes(currency);

    return `
      <div class="currency-item ${isSelected ? 'selected' : ''}" data-currency="${currency}">
        <div class="currency-left">
          <span class="currency-flag">₿</span>
          <div>
            <div class="currency-code">${currency}</div>
            <div class="currency-name">${meta.name}</div>
          </div>
        </div>
        <input type="checkbox" class="ticker-currency-checkbox" ${isSelected ? 'checked' : ''}>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.currency-item').forEach(item => {
    item.addEventListener('click', () => {
      const checkbox = item.querySelector('.ticker-currency-checkbox');
      checkbox.checked = !checkbox.checked;
      item.classList.toggle('selected', checkbox.checked);
    });
  });
}

function getSelectedTickerCurrencies() {
  const checkboxes = document.querySelectorAll('.ticker-currency-checkbox');
  const selected = [];

  checkboxes.forEach((cb, index) => {
    if (cb.checked) {
      selected.push(availableTickerCurrencies[index]);
    }
  });

  return selected;
}

function selectAllTickerCurrencies(select) {
  document.querySelectorAll('#tickerCurrenciesList .currency-item').forEach(item => {
    const checkbox = item.querySelector('.ticker-currency-checkbox');
    checkbox.checked = select;
    item.classList.toggle('selected', select);
  });
}

// ═══════════════════════════════════════════════
//  Save/Reset
// ═══════════════════════════════════════════════
async function saveSettings() {
  // Get theme
  const themeBtn = document.querySelector('#themeGroup .seg-btn.active');
  const theme = themeBtn ? themeBtn.dataset.val : 'auto';

  // Get fuente de datos preferida
  const sourceBtn = document.querySelector('#sourceGroup .seg-btn.active');
  const sourcePreference = sourceBtn ? sourceBtn.dataset.val : 'eltoque';

  // Get selected currencies
  const selectedCurrencies = getSelectedCurrencies();
  const selectedTickerCurrencies = getSelectedTickerCurrencies();
  
  // Build settings object
  const newSettings = {
    ...settings,
    updateInterval: parseInt(document.getElementById('updateInterval').value),
    iconRotateEnabled: document.getElementById('iconRotateEnabled').checked,
    iconRotateInterval: parseInt(document.getElementById('iconRotateInterval').value),
    colorBg: theme,
    sourcePreference,
    newTabEnabled: document.getElementById('newTabEnabled').checked,
    omniboxEnabled: document.getElementById('omniboxEnabled').checked,
    tickerEnabled: document.getElementById('tickerEnabled').checked,
    fontSize: parseInt(document.getElementById('fontSize').value),
    scrollSpeed: parseInt(document.getElementById('scrollSpeed').value),
    showCurrencyFlag: document.getElementById('showCurrencyFlag').checked,
    showTimestamp: document.getElementById('showTimestamp').checked,
    compactMode: document.getElementById('compactMode').checked,
    colorUp: document.getElementById('colorUp').value,
    colorDown: document.getElementById('colorDown').value,
    selectedCurrencies: selectedCurrencies.length > 0 ? selectedCurrencies : [],
    tickerCurrencies: selectedTickerCurrencies.length > 0 ? selectedTickerCurrencies : [...DEFAULT_TICKER_CURRENCIES],
  };
  
  // Save to storage
  await browser.storage.local.set({ settings: newSettings });
  
  // Notify background script
  await browser.runtime.sendMessage({ 
    type: 'UPDATE_SETTINGS', 
    settings: newSettings 
  });
  
  // Show toast
  showToast();
}

function resetSettings() {
  if (confirm('¿Restaurar configuración a valores por defecto?')) {
    settings = { ...DEFAULT_SETTINGS };
    loadFormValues();
    renderCurrenciesList();
    renderTickerCurrenciesList();
    saveSettings();
  }
}

function showToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
